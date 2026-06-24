#!/usr/bin/env python3
"""
fetch_stocks.py — 拉取全A股行情与财务数据，写入 SQLite。

依赖: pip install akshare
运行: python scripts/fetch_stocks.py
"""

import sqlite3
import sys
from datetime import datetime, date
import pandas as pd

# 数据库在 backend 目录下（与 Spring Boot working directory 一致）
import os
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.path.join(PROJECT_DIR, "backend", "data", "compound.db")

# ── 1. 数据库初始化 ────────────────────────────────────────────

def init_db(conn):
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS stocks (
            symbol          TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            industry        TEXT,
            price           REAL,
            pe_ttm          REAL,
            pb              REAL,
            roe             REAL,
            revenue_growth  REAL,
            profit_growth   REAL,
            dividend_yield  REAL,
            market_cap      REAL,
            debt_ratio      REAL,
            is_st           INTEGER DEFAULT 0,
            is_suspended    INTEGER DEFAULT 0,
            listing_days    INTEGER,
            updated_at      TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS data_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            run_at      TEXT,
            stock_count INTEGER,
            status      TEXT,
            error_msg   TEXT
        )
    """)
    # 索引：覆盖三个策略模板的核心筛选字段
    conn.execute("CREATE INDEX IF NOT EXISTS idx_pe_ttm ON stocks(pe_ttm)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_roe ON stocks(roe)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_industry ON stocks(industry)")
    conn.commit()


# ── 2. 数据拉取 ────────────────────────────────────────────────

import time


def safe_float(val):
    """将值转为 float，None/'-'/空字符串 返回 None"""
    if val is None or val == "-" or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None

def with_retry(func, name, max_retries=3, base_delay=5):
    """带重试的API调用包装器：指数退避 + 最大重试次数"""
    for attempt in range(1, max_retries + 1):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries:
                raise
            delay = base_delay * (2 ** (attempt - 1))
            print(f"      [{name}] 第{attempt}次失败: {e}，{delay}s后重试...", file=sys.stderr)
            time.sleep(delay)

def fetch_spot_data():
    """
    拉取全A股实时行情（腾讯源 + Sina 股票列表备用），包含 PE/PB/总市值。

    数据来源：
      - akshare stock_zh_a_spot (Sina) → 全量股票代码和名称
      - 腾讯行情 API → 实时价格、PE(TTM)、PB、总市值
    """
    import requests
    import re
    import akshare as ak

    # ── 步骤1: 从 akshare (Sina) 获取全量股票代码 ──
    print("      [1a] 从 Sina 获取全量股票列表...")
    try:
        sina_df = ak.stock_zh_a_spot()
        print(f"           获取到 {len(sina_df)} 只股票")
    except Exception as e:
        raise RuntimeError(f"Sina 股票列表获取失败: {e}")

    # ── 步骤2: 构造腾讯行情查询代码 ──
    # Sina 的 stock_zh_a_spot 返回的代码已带前缀 (sh600519, sz000001, bj920000)
    # 与腾讯格式一致，直接使用即可
    codes = [str(row["代码"]) for _, row in sina_df.iterrows()]
    # 用纯数字代码映射名称（腾讯返回的 symbol 无前缀）
    code_to_name = {}
    for _, row in sina_df.iterrows():
        raw_code = str(row["代码"])
        # Sina 代码格式: sh600519 → 提取 600519
        numeric = raw_code[2:] if len(raw_code) > 2 and raw_code[:2].isalpha() else raw_code
        code_to_name[numeric] = str(row["名称"])

    # ── 步骤3: 批量查询腾讯行情 API ──
    print(f"      [1b] 从腾讯批量拉取行情 (共 {len(codes)} 只)...")
    all_pages = []
    batch_size = 80  # 每批 80 只
    total_batches = (len(codes) + batch_size - 1) // batch_size

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "https://finance.qq.com/",
    })

    for i in range(0, len(codes), batch_size):
        batch = codes[i:i + batch_size]
        batch_num = i // batch_size + 1
        print(f"            批次 {batch_num}/{total_batches}...", end="\r")

        # 逐批重试最多2次
        for attempt in range(2):
            try:
                url = f"http://qt.gtimg.cn/q={','.join(batch)}"
                resp = session.get(url, timeout=30)
                resp.raise_for_status()
                # 腾讯返回编码为 gbk，需要正确解码
                resp.encoding = 'gbk'
                text = resp.text
                break
            except Exception as e:
                if attempt == 1:
                    print(f"\n            [WARN] 批次 {batch_num} 请求失败: {e}")
                    text = ""
                    break
                time.sleep(2)

        # 解析每行数据: v_sh600519="字段1~字段2~..."
        for line in text.strip().split("\n"):
            if not line.strip():
                continue
            match = re.match(r'v_(\w+)="(.*)"', line.strip())
            if not match:
                continue
            fields = match.group(2).split("~")
            if len(fields) < 67:
                continue
            try:
                symbol = fields[2]
                all_pages.append({
                    "symbol": symbol,
                    "name": code_to_name.get(symbol, fields[1]),
                    "price": safe_float(fields[3]),
                    "pe_ttm": safe_float(fields[65]),      # PE(TTM)
                    "pb": safe_float(fields[66]),           # PB
                    "market_cap_raw": safe_float(fields[44]),  # 总市值(亿元)
                })
            except (IndexError, ValueError):
                continue

        time.sleep(0.15)  # 请求间隔

    session.close()
    print(f"\n            行情累计拉取 {len(all_pages)} 条（共 {total_batches} 批）")

    if not all_pages:
        raise RuntimeError("未能获取任何行情数据")

    df = pd.DataFrame(all_pages)
    # 总市值已经是亿元单位
    df["market_cap"] = df["market_cap_raw"].apply(
        lambda x: round(float(x), 2) if safe_float(x) and safe_float(x) > 0 else None
    )
    df = df.drop(columns=["market_cap_raw"])
    print(f"      共获取到 {len(df)} 只股票")
    return df


def fetch_financial_data():
    """
    拉取财务指标（ROE/营收增长/利润增长/行业/资产负债率/股息率/上市天数），带重试。

    数据来源：
      - akshare stock_yjbb_em → ROE、营收增长、利润增长、行业
      - Eastmoney RPT_DMSK_FN_BALANCE → 资产负债率
      - akshare stock_history_dividend → 上市日期、股息数据
    """
    def _do_fetch_finance():
        import akshare as ak

        report_date_str = latest_report_date()  # e.g. "2026-03-31"

        # ── 2a. 核心财务指标（akshare 批量接口） ──
        print("      [2a] 拉取季度业绩报表 (akshare stock_yjbb_em)...")
        try:
            yjbb = ak.stock_yjbb_em(date=report_date_str.replace("-", ""))
            print(f"           获取到 {len(yjbb)} 条季度报表记录")
        except Exception as e:
            raise RuntimeError(f"季度业绩报表拉取失败: {e}")

        # 列位: [1]股票代码 [5]营业收入-同比增长 [8]净利润-同比增长 [11]净资产收益率 [14]所属行业
        fin_rows = []
        for _, row in yjbb.iterrows():
            fin_rows.append({
                "symbol": str(row.iloc[1]).zfill(6),
                "roe": safe_float_val(row.iloc[11]),
                "revenue_growth": safe_float_val(row.iloc[5]),
                "profit_growth": safe_float_val(row.iloc[8]),
                "industry_raw": row.iloc[14] if pd.notna(row.iloc[14]) else None,
            })
        fin_df = pd.DataFrame(fin_rows)
        print(f"           解析 {len(fin_df)} 条财务指标记录")

        # ── 2b. 资产负债率（Eastmoney RPT_DMSK_FN_BALANCE） ──
        print("      [2b] 拉取资产负债表 (Eastmoney RPT_DMSK_FN_BALANCE)...")
        debt_df = _fetch_balance_sheet_debt(report_date_str)
        if debt_df is not None:
            print(f"           获取到 {len(debt_df)} 条资产负债记录")

        # ── 2c. 上市日期 + 股息数据（akshare 批量接口） ──
        print("      [2c] 拉取历史分红数据 (akshare stock_history_dividend)...")
        try:
            div_df = ak.stock_history_dividend()
            # 列位: [0]代码 [2]上市日期 [4]年均股息(每10股)
            listing_and_div = []
            for _, row in div_df.iterrows():
                code = str(row.iloc[0]).zfill(6)  # column 0 = stock code
                listing_date = row.iloc[2]  # column 2 = listing date
                avg_div = safe_float_val(row.iloc[4])  # column 4 = avg annual dividend per 10 shares
                listing_and_div.append({
                    "symbol": code,
                    "listing_date": listing_date,
                    "avg_dividend_per_10": avg_div,  # 每10股年均股息
                })
            ld_df = pd.DataFrame(listing_and_div)
            print(f"           获取到 {len(ld_df)} 条分红/上市记录")
        except Exception as e:
            print(f"           [WARN] 分红数据拉取失败: {e}")
            ld_df = None

        # ── 合并三个数据源 ──
        merged = fin_df.copy()
        if debt_df is not None:
            merged = merged.merge(debt_df, on="symbol", how="left")
        else:
            merged["debt_ratio"] = None

        if ld_df is not None:
            merged = merged.merge(ld_df, on="symbol", how="left")
        else:
            merged["listing_date"] = None
            merged["avg_dividend_per_10"] = None

        return merged

    result = with_retry(_do_fetch_finance, "财务数据", max_retries=2, base_delay=5)
    print(f"      合并后共 {len(result)} 条财务记录")
    return result


def safe_float_val(val):
    """将值安全转为 float，无法转换的返回 None"""
    if val is None:
        return None
    try:
        v = float(val)
        if pd.isna(v):
            return None
        return v
    except (ValueError, TypeError):
        return None


def _fetch_balance_sheet_debt(report_date_str):
    """从 Eastmoney RPT_DMSK_FN_BALANCE 拉取资产负债率"""
    import requests

    url = "http://datacenter.eastmoney.com/api/data/v1/get"
    page_size = 500
    max_pages = 12
    all_items = []

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": "http://data.eastmoney.com/",
    })

    for page in range(1, max_pages + 1):
        params = {
            "reportName": "RPT_DMSK_FN_BALANCE",
            "columns": "SECURITY_CODE,DEBT_ASSET_RATIO,TOTAL_ASSETS,TOTAL_LIABILITIES",
            "filter": f"(REPORT_DATE='{report_date_str}')",
            "pageNumber": page,
            "pageSize": page_size,
            "sortTypes": -1,
            "sortColumns": "SECURITY_CODE",
        }
        try:
            resp = session.get(url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if not data or not data.get("success"):
                break
            result = data.get("result")
            if not result:
                break
            items = result.get("data") or []
            if not items:
                break
            for item in items:
                debt_ratio = item.get("DEBT_ASSET_RATIO")
                total_assets = item.get("TOTAL_ASSETS")
                total_liabilities = item.get("TOTAL_LIABILITIES")
                # 如果 DEBT_ASSET_RATIO 为 None，尝试通过 负债/资产 计算
                if debt_ratio is None and total_assets and total_liabilities and total_assets > 0:
                    debt_ratio = round(total_liabilities / total_assets * 100, 2)
                all_items.append({
                    "symbol": str(item.get("SECURITY_CODE", "")).zfill(6),
                    "debt_ratio": safe_float_val(debt_ratio),
                })
            print(f"      资产负债第{page}页: 获取 {len(items)} 条（累计 {len(all_items)}）", end="\r")
            time.sleep(0.3)
        except Exception as e:
            print(f"\n      [WARN] 资产负债第{page}页请求失败: {e}")
            time.sleep(2)
            continue

    print()  # 换行
    session.close()

    if not all_items:
        print("      [WARN] 未获取到任何资产负债数据")
        return None

    return pd.DataFrame(all_items)


def latest_report_date():
    """返回最近一个季报日期，格式 YYYY-MM-DD"""
    today = date.today()
    quarter_ends = [
        date(today.year, 3, 31),
        date(today.year, 6, 30),
        date(today.year, 9, 30),
        date(today.year, 12, 31),
    ]
    candidates = [d for d in quarter_ends if d < today]
    if not candidates:
        candidates = [date(today.year - 1, 12, 31)]
    latest = max(candidates)
    return latest.strftime("%Y-%m-%d")


# ── 3. 数据清洗与合并 ──────────────────────────────────────────

def clean_and_merge(spot_df, finance_df):
    from datetime import date as dt_date

    # 合并
    merged = spot_df.copy()
    if finance_df is not None:
        merged = merged.merge(finance_df, on="symbol", how="left")

    # 行业：优先使用财务数据中的行业
    if "industry_raw" in merged.columns:
        merged["industry"] = merged["industry_raw"]
        merged = merged.drop(columns=["industry_raw"])
    else:
        merged["industry"] = None

    # ST 判断：名称含 "ST" 或 "*ST"
    merged["is_st"] = merged["name"].apply(
        lambda n: 1 if isinstance(n, str) and ("ST" in n) else 0
    )

    # 停牌判断：价格为 0 或 null
    merged["is_suspended"] = merged["price"].apply(
        lambda p: 1 if pd.isna(p) or p <= 0 else 0
    )

    # 上市天数：从 listing_date 计算
    today = dt_date.today()
    def calc_listing_days(listing_date_val):
        """计算上市天数，无效日期返回 None"""
        if listing_date_val is None or pd.isna(listing_date_val):
            return None
        try:
            if isinstance(listing_date_val, str):
                ld = dt_date.fromisoformat(listing_date_val)
            elif isinstance(listing_date_val, dt_date):
                ld = listing_date_val
            elif isinstance(listing_date_val, pd.Timestamp):
                ld = listing_date_val.date()
            else:
                return None
            return (today - ld).days
        except (ValueError, TypeError):
            return None

    if "listing_date" in merged.columns:
        merged["listing_days"] = merged["listing_date"].apply(calc_listing_days)
        merged = merged.drop(columns=["listing_date"])
    else:
        merged["listing_days"] = None

    # 股息率：从 avg_dividend_per_10 + price 计算  (股息率 = 每股股息 / 股价 * 100)
    def calc_dividend_yield(row):
        avg_div = row.get("avg_dividend_per_10")
        price = row.get("price")
        if avg_div is None or price is None or price <= 0:
            return None
        try:
            div_per_share = float(avg_div) / 10.0  # 每10股 → 每股
            return round(div_per_share / float(price) * 100, 2)
        except (ValueError, TypeError, ZeroDivisionError):
            return None

    if "avg_dividend_per_10" in merged.columns:
        merged["dividend_yield"] = merged.apply(calc_dividend_yield, axis=1)
        merged = merged.drop(columns=["avg_dividend_per_10"])
    else:
        merged["dividend_yield"] = None

    # 资产负债率：已在 fetch_financial_data 中获取，确保为数值类型
    if "debt_ratio" not in merged.columns:
        merged["debt_ratio"] = None

    # 确保所有数值列为 Python float 或 None
    def safe_to_float(x):
        if x is None or x == "-" or x == "":
            return None
        try:
            return float(x)
        except (ValueError, TypeError):
            return None

    numeric_cols = ["price", "pe_ttm", "pb", "roe", "revenue_growth",
                    "profit_growth", "dividend_yield", "market_cap", "debt_ratio"]
    for col in numeric_cols:
        if col in merged.columns:
            merged[col] = merged[col].apply(safe_to_float)

    # 去重：按 symbol 保留第一条
    merged = merged.drop_duplicates(subset=["symbol"], keep="first")

    return merged


# ── 4. 写入数据库 ──────────────────────────────────────────────

def write_to_db(conn, df):
    import numpy as np

    # 替换 NaN 为 None（SQLite 用 NULL）
    df = df.where(pd.notna(df), None)

    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    count = 0

    try:
        cursor.execute("BEGIN")
        cursor.execute("DELETE FROM stocks")

        cols = [
            "symbol", "name", "industry", "price", "pe_ttm", "pb", "roe",
            "revenue_growth", "profit_growth", "dividend_yield", "market_cap",
            "debt_ratio", "is_st", "is_suspended", "listing_days"
        ]
        placeholders = ", ".join(["?"] * (len(cols) + 1))  # +1 for updated_at

        for _, row in df.iterrows():
            values = []
            for col in cols:
                val = row.get(col) if col in df.columns else None
                # numpy types → Python native
                if isinstance(val, (np.integer,)):
                    val = int(val)
                elif isinstance(val, (np.floating,)):
                    val = float(val) if not np.isnan(val) else None
                elif isinstance(val, float) and np.isnan(val):
                    val = None
                values.append(val)
            values.append(now)  # updated_at

            cursor.execute(
                f"INSERT INTO stocks ({', '.join(cols)}, updated_at) VALUES ({placeholders})",
                values
            )
            count += 1

        # 写入日志
        cursor.execute(
            "INSERT INTO data_log (run_at, stock_count, status) VALUES (?, ?, ?)",
            (now, count, "SUCCESS")
        )
        conn.commit()
        print(f"[OK] 成功写入 {count} 条记录")

    except Exception as e:
        conn.rollback()
        cursor.execute(
            "INSERT INTO data_log (run_at, stock_count, status, error_msg) VALUES (?, ?, ?, ?)",
            (now, 0, "FAILED", str(e)[:500])
        )
        conn.commit()
        raise


# ── 5. 主流程 ──────────────────────────────────────────────────

def main():
    import os
    import argparse

    parser = argparse.ArgumentParser(description="拉取全A股数据到 SQLite")
    parser.add_argument("--db-path", default=None, help="SQLite 数据库路径（默认: backend/data/compound.db）")
    args = parser.parse_args()

    # 优先使用命令行参数，否则使用脚本同目录推导
    global DB_PATH
    if args.db_path:
        DB_PATH = args.db_path

    # 确保 data 目录存在
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    try:
        print("[1/4] 拉取全A股行情...")
        spot_df = fetch_spot_data()
        print(f"      获取到 {len(spot_df)} 只股票")

        print("[2/4] 拉取财务指标...")
        finance_df = fetch_financial_data()
        if finance_df is not None:
            print(f"      获取到 {len(finance_df)} 条财务记录")

        print("[3/4] 合并清洗...")
        merged_df = clean_and_merge(spot_df, finance_df)
        print(f"      合并后 {len(merged_df)} 条")

        print("[4/4] 写入数据库...")
        write_to_db(conn, merged_df)

    except Exception as e:
        print(f"[FAIL] 采集失败: {e}", file=sys.stderr)
        # 即使未到达 write_to_db，也尽力写入 FAILED 日志
        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO data_log (run_at, stock_count, status, error_msg) VALUES (?, ?, ?, ?)",
                (now, 0, "FAILED", str(e)[:500])
            )
            conn.commit()
        except Exception:
            pass  # 尽最大努力
        sys.exit(1)
    finally:
        conn.close()

    print("[DONE] 数据更新完成")


if __name__ == "__main__":
    main()
