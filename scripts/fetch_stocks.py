#!/usr/bin/env python3
"""
fetch_stocks.py — 拉取全A股行情与财务数据，写入 SQLite。

依赖: pip install akshare
运行: python scripts/fetch_stocks.py
"""

import sqlite3
import sys
from datetime import datetime, date

DB_PATH = "data/compound.db"

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

def fetch_spot_data():
    """拉取全A股实时行情（东方财富源）"""
    import akshare as ak
    import pandas as pd
    df = ak.stock_zh_a_spot_em()
    # 列重命名为英文
    col_map = {
        "代码": "symbol",
        "名称": "name",
        "最新价": "price",
        "市盈率-动态": "pe_ttm",
        "市净率": "pb",
        "总市值": "market_cap_raw",
    }
    df = df.rename(columns=col_map)
    # 只保留需要的列
    keep = ["symbol", "name", "price", "pe_ttm", "pb", "market_cap_raw"]
    df = df[[c for c in keep if c in df.columns]].copy()
    # 总市值转换为亿元
    if "market_cap_raw" in df.columns:
        df["market_cap"] = df["market_cap_raw"].apply(
            lambda x: round(x / 1e8, 2) if pd.notna(x) and x > 0 else None
        )
        df = df.drop(columns=["market_cap_raw"])
    return df


def fetch_financial_data():
    """拉取最新季度财务指标（东方财富业绩报表）"""
    import akshare as ak
    try:
        # 获取最新季报数据
        df = ak.stock_yjbb_em(date=latest_report_date())
        col_map = {
            "股票代码": "symbol",
            "净资产收益率": "roe",
            "营业收入-同比增长": "revenue_growth",
            "净利润-同比增长": "profit_growth",
            "所处行业": "industry_raw",
        }
        df = df.rename(columns=col_map)
        keep = ["symbol", "roe", "revenue_growth", "profit_growth", "industry_raw"]
        df = df[[c for c in keep if c in df.columns]].copy()
        return df
    except Exception as e:
        print(f"[WARN] 财务数据拉取失败: {e}", file=sys.stderr)
        return None


def latest_report_date():
    """返回最近一个季报日期，格式 YYYY-03-31 / YYYY-06-30 / YYYY-09-30 / YYYY-12-31"""
    today = date.today()
    # 最近完成的季度末
    quarter_ends = [
        date(today.year, 3, 31),
        date(today.year, 6, 30),
        date(today.year, 9, 30),
        date(today.year, 12, 31),
    ]
    candidates = [d for d in quarter_ends if d < today]
    if not candidates:
        # 年初，用上一年Q4
        candidates = [date(today.year - 1, 12, 31)]
    latest = max(candidates)
    return latest.strftime("%Y-%m-%d")


# ── 3. 数据清洗与合并 ──────────────────────────────────────────

def clean_and_merge(spot_df, finance_df):
    import pandas as pd

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

    # 上市天数 → 留空（需要逐个查询上市日期），默认 null
    merged["listing_days"] = None

    # 股息率、资产负债率 → 留空（需要额外接口），默认 null
    merged["dividend_yield"] = None
    merged["debt_ratio"] = None

    # 确保所有数值列为 Python float 或 None
    numeric_cols = ["price", "pe_ttm", "pb", "roe", "revenue_growth",
                    "profit_growth", "dividend_yield", "market_cap", "debt_ratio"]
    for col in numeric_cols:
        if col in merged.columns:
            merged[col] = merged[col].apply(
                lambda x: float(x) if pd.notna(x) and x != "None" else None
            )

    return merged


# ── 4. 写入数据库 ──────────────────────────────────────────────

def write_to_db(conn, df):
    import numpy as np
    import pandas as pd

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
    import pandas as pd

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
        sys.exit(1)
    finally:
        conn.close()

    print("[DONE] 数据更新完成")


if __name__ == "__main__":
    import pandas as pd
    main()
