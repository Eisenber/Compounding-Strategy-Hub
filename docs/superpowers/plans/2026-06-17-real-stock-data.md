# Real A-Stock Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded MockStockDataProvider with a real A-stock data pipeline: Python script fetches daily data via akshare → SQLite → Spring Boot queries via JdbcTemplate.

**Architecture:** Python script (`scripts/fetch_stocks.py`) pulls all A-stock spot + financial data from akshare, cleans/merges, and writes to SQLite via transaction. Java backend reads SQLite via JdbcTemplate in a new `StockRepository`. The two systems communicate only through the database file.

**Tech Stack:** Python 3 + akshare + sqlite3 (stdlib) | Java 21 + Spring Boot 3.4.1 + spring-boot-starter-jdbc + sqlite-jdbc 3.45.3.0

**Design Spec:** [2026-06-17-real-stock-data-design.md](../specs/2026-06-17-real-stock-data-design.md)

---

### File Map

| File | Action | Purpose |
|------|--------|---------|
| `scripts/fetch_stocks.py` | **Create** | Python script: fetch akshare data → SQLite |
| `backend/pom.xml` | Modify | Add spring-boot-starter-jdbc + sqlite-jdbc |
| `backend/src/main/resources/application.properties` | Modify | Add SQLite datasource config |
| `backend/src/main/java/com/example/compound/dto/v2/StockItemDto.java` | Modify | +isSt, +isSuspended, +listingDays |
| `backend/src/main/java/com/example/compound/repository/v2/StockRepository.java` | **Create** | JdbcTemplate-backed data access |
| `backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java` | Modify | Inject StockRepository, use real exclusion rules |
| `backend/src/main/java/com/example/compound/controller/v2/StrategyController.java` | Modify | Spring DI: inject services via constructor |

---

### Task 1: Python Data Collection Script

**Files:**
- Create: `scripts/fetch_stocks.py`
- Create: `scripts/requirements.txt`

- [ ] **Step 1: Create requirements.txt**

Write `scripts/requirements.txt`:

```
akshare>=1.14.0
```

- [ ] **Step 2: Create the fetch_stocks.py script**

Write `scripts/fetch_stocks.py`:

```python
#!/usr/bin/env python3
"""
fetch_stocks.py — 拉取全A股行情与财务数据，写入 SQLite。

依赖: pip install akshare
运行: python scripts/fetch_stocks.py
"""

import sqlite3
import sys
from datetime import datetime, date, timedelta

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

    # 替换 NaN 为 None（SQLite 用 NULL）
    df = df.where(pd.notna(df), None)

    cursor = conn.cursor()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    count = 0
    errors = []

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
```

- [ ] **Step 3: Verify the script parses correctly**

Run: `python -c "import ast; ast.parse(open('scripts/fetch_stocks.py').read()); print('Syntax OK')"`

Expected: `Syntax OK`

- [ ] **Step 4: Commit Python script**

```bash
git add scripts/fetch_stocks.py scripts/requirements.txt
git commit -m "feat: add Python data collection script (akshare → SQLite)"
```

---

### Task 2: Java Dependencies and Datasource Config

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: Add JDBC and SQLite dependencies to pom.xml**

Open `backend/pom.xml`. After the `spring-boot-starter-validation` dependency block (line 34), insert:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>3.45.3.0</version>
        </dependency>
```

The resulting `<dependencies>` block should read:

```xml
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>
        <dependency>
            <groupId>org.xerial</groupId>
            <artifactId>sqlite-jdbc</artifactId>
            <version>3.45.3.0</version>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
```

- [ ] **Step 2: Add SQLite datasource config to application.properties**

Open `backend/src/main/resources/application.properties`. Append to end of file:

```properties
# SQLite datasource — compound.db is created/written by fetch_stocks.py
spring.datasource.url=jdbc:sqlite:data/compound.db
spring.datasource.driver-class-name=org.sqlite.JDBC
```

The full file should now contain:

```properties
server.port=8080
spring.application.name=compound-compare

# Force UTF-8 encoding for HTTP responses and requests
server.servlet.encoding.charset=UTF-8
server.servlet.encoding.enabled=true
server.servlet.encoding.force=true
spring.http.encoding.charset=UTF-8
spring.http.encoding.enabled=true
spring.http.encoding.force=true

# SQLite datasource — compound.db is created/written by fetch_stocks.py
spring.datasource.url=jdbc:sqlite:data/compound.db
spring.datasource.driver-class-name=org.sqlite.JDBC
```

- [ ] **Step 3: Verify Maven resolves new dependencies**

Run: `cd backend && mvn dependency:resolve -q`
Expected: BUILD SUCCESS (no errors about missing sqlite-jdbc or jdbc starter)

- [ ] **Step 4: Commit dependency and config changes**

```bash
git add backend/pom.xml backend/src/main/resources/application.properties
git commit -m "feat: add sqlite-jdbc and spring-boot-starter-jdbc, configure SQLite datasource"
```

---

### Task 3: Extend StockItemDto with Real-Data Fields

**Files:**
- Modify: `backend/src/main/java/com/example/compound/dto/v2/StockItemDto.java`

- [ ] **Step 1: Add isSt, isSuspended, listingDays fields and getters/setters**

Open `StockItemDto.java`. Add three new fields after `debtRatio`:

```java
    private double debtRatio;
    private boolean isSt;
    private boolean isSuspended;
    private int listingDays;
    private String reason;
```

Add getter/setter methods after `setDebtRatio`:

```java
    public boolean isSt() {
        return isSt;
    }

    public void setSt(boolean isSt) {
        this.isSt = isSt;
    }

    public boolean isSuspended() {
        return isSuspended;
    }

    public void setSuspended(boolean isSuspended) {
        this.isSuspended = isSuspended;
    }

    public int getListingDays() {
        return listingDays;
    }

    public void setListingDays(int listingDays) {
        this.listingDays = listingDays;
    }
```

The full class structure (fields section) should now be:

```java
public class StockItemDto {

    private String symbol;
    private String name;
    private String industry;
    private double price;
    private double peTtm;
    private double pb;
    private double roe;
    private double revenueGrowth;
    private double profitGrowth;
    private double dividendYield;
    private double marketCap;
    private double debtRatio;
    private boolean isSt;
    private boolean isSuspended;
    private int listingDays;
    private String reason;
    private List<String> riskTags;

    // ... all getters/setters
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit DTO changes**

```bash
git add backend/src/main/java/com/example/compound/dto/v2/StockItemDto.java
git commit -m "feat: add isSt, isSuspended, listingDays fields to StockItemDto"
```

---

### Task 4: Create StockRepository

**Files:**
- Create: `backend/src/main/java/com/example/compound/repository/v2/StockRepository.java`

- [ ] **Step 1: Create the repository directory**

```bash
mkdir -p backend/src/main/java/com/example/compound/repository/v2
```

- [ ] **Step 2: Write StockRepository.java**

Write `backend/src/main/java/com/example/compound/repository/v2/StockRepository.java`:

```java
package com.example.compound.repository.v2;

import com.example.compound.dto.v2.StockItemDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;

/**
 * A股数据仓库 — 从 SQLite compound.db 读取全A股行情与财务数据。
 * <p>
 * 数据由 Python fetch_stocks.py 脚本每日更新，此类只读。
 */
@Repository
public class StockRepository {

    private final JdbcTemplate jdbc;

    public StockRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 返回全量A股数据（与旧 MockStockDataProvider.getAllStocks() 接口一致）。
     * 调用方在内存中完成筛选/排序/分页。
     */
    public List<StockItemDto> getAllStocks() {
        String sql = """
                SELECT symbol, name, industry, price, pe_ttm, pb, roe,
                       revenue_growth, profit_growth, dividend_yield,
                       market_cap, debt_ratio, is_st, is_suspended, listing_days
                FROM stocks
                """;
        return jdbc.query(sql, new StockRowMapper());
    }

    /**
     * RowMapper: ResultSet → StockItemDto
     */
    private static class StockRowMapper implements RowMapper<StockItemDto> {
        @Override
        public StockItemDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            StockItemDto dto = new StockItemDto();
            dto.setSymbol(rs.getString("symbol"));
            dto.setName(rs.getString("name"));
            dto.setIndustry(rs.getString("industry"));
            dto.setPrice(getDouble(rs, "price"));
            dto.setPeTtm(getDouble(rs, "pe_ttm"));
            dto.setPb(getDouble(rs, "pb"));
            dto.setRoe(getDouble(rs, "roe"));
            dto.setRevenueGrowth(getDouble(rs, "revenue_growth"));
            dto.setProfitGrowth(getDouble(rs, "profit_growth"));
            dto.setDividendYield(getDouble(rs, "dividend_yield"));
            dto.setMarketCap(getDouble(rs, "market_cap"));
            dto.setDebtRatio(getDouble(rs, "debt_ratio"));
            dto.setSt(rs.getInt("is_st") == 1);
            dto.setSuspended(rs.getInt("is_suspended") == 1);
            dto.setListingDays(rs.getInt("listing_days"));
            return dto;
        }

        private double getDouble(ResultSet rs, String column) throws SQLException {
            double v = rs.getDouble(column);
            return rs.wasNull() ? 0.0 : v;
        }
    }
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit StockRepository**

```bash
git add backend/src/main/java/com/example/compound/repository/v2/StockRepository.java
git commit -m "feat: add StockRepository with JdbcTemplate-backed SQLite queries"
```

---

### Task 5: Update StockScreeningService to Use Real Data

**Files:**
- Modify: `backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java`

- [ ] **Step 1: Replace MockStockDataProvider with StockRepository**

Change the constructor and field from:

```java
import com.example.compound.data.v2.MockStockDataProvider;
// ...
public class StockScreeningService {

    private final StrategyTemplateService templateService;

    public StockScreeningService(StrategyTemplateService templateService) {
        this.templateService = templateService;
    }
```

To:

```java
import com.example.compound.repository.v2.StockRepository;
// ...
public class StockScreeningService {

    private final StrategyTemplateService templateService;
    private final StockRepository stockRepository;

    public StockScreeningService(StrategyTemplateService templateService,
                                  StockRepository stockRepository) {
        this.templateService = templateService;
        this.stockRepository = stockRepository;
    }
```

- [ ] **Step 2: Replace data fetch call**

In the `screen()` method, change line:

```java
        List<StockItemDto> allStocks = MockStockDataProvider.getAllStocks();
```

To:

```java
        List<StockItemDto> allStocks = stockRepository.getAllStocks();
```

- [ ] **Step 3: Update exclusion rules to use real fields**

Replace the `isExcludedByCommonRules` method:

Old method (lines 90-103):

```java
    private boolean isExcludedByCommonRules(StockItemDto s, Map<String, Object> filters) {
        // 排除 ST
        if (getBoolean(filters, "excludeSt") && s.getName() != null && s.getName().contains("ST")) {
            return true;
        }
        // 排除停牌（价格<=0 或 PE为负且营收极度萎缩视为停牌信号）
        if (getBoolean(filters, "excludeSuspended") && s.getPrice() <= 0) {
            return true;
        }
        // 排除上市未满180天（用代码 688xxx 标识次新股）
        if (filters.containsKey("minListingDays") && s.getSymbol().startsWith("688")) {
            return true;
        }
        return false;
    }
```

New method:

```java
    /** 通用排除规则：ST、停牌、次新股 — 使用真实数据字段 */
    private boolean isExcludedByCommonRules(StockItemDto s, Map<String, Object> filters) {
        // 排除 ST（使用真实 isSt 字段）
        if (getBoolean(filters, "excludeSt") && s.isSt()) {
            return true;
        }
        // 排除停牌（使用真实 isSuspended 字段）
        if (getBoolean(filters, "excludeSuspended") && s.isSuspended()) {
            return true;
        }
        // 排除上市未满 N 天（使用真实 listingDays 字段）
        Integer minDays = getInt(filters, "minListingDays");
        if (minDays != null && s.getListingDays() > 0 && s.getListingDays() < minDays) {
            return true;
        }
        return false;
    }
```

- [ ] **Step 4: Add getInt helper method**

Add after the `getBoolean` method at the bottom of the class:

```java
    private static Integer getInt(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit service changes**

```bash
git add backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java
git commit -m "feat: switch StockScreeningService from MockStockDataProvider to StockRepository with real exclusion rules"
```

---

### Task 6: Update StrategyController for Spring Dependency Injection

**Files:**
- Modify: `backend/src/main/java/com/example/compound/controller/v2/StrategyController.java`

- [ ] **Step 1: Convert to Spring-managed bean with constructor injection**

Replace the entire class from:

```java
@RestController
@RequestMapping("/api/v2/strategies")
public class StrategyController {

    private final StrategyTemplateService templateService;
    private final StockScreeningService screeningService;

    public StrategyController() {
        this.templateService = new StrategyTemplateService();
        this.screeningService = new StockScreeningService(templateService);
    }
```

To:

```java
@RestController
@RequestMapping("/api/v2/strategies")
public class StrategyController {

    private final StrategyTemplateService templateService;
    private final StockScreeningService screeningService;

    public StrategyController(StrategyTemplateService templateService,
                               StockScreeningService screeningService) {
        this.templateService = templateService;
        this.screeningService = screeningService;
    }
```

- [ ] **Step 2: Update imports — remove unused, add none needed**

The import block stays the same. The `StockScreeningService` import is already present. No new imports needed.

- [ ] **Step 3: Make StockScreeningService a Spring bean**

Add `@Service` annotation to `StockScreeningService.java`. Open the file and change:

```java
import java.util.*;
import java.util.stream.Collectors;

/**
 * 股票筛选服务 ...
 */
public class StockScreeningService {
```

To:

```java
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 股票筛选服务 ...
 */
@Service
public class StockScreeningService {
```

- [ ] **Step 4: Make StrategyTemplateService a Spring bean**

Add `@Service` annotation to `StrategyTemplateService.java`. Open the file and change:

```java
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 策略模板服务 ...
 */
public class StrategyTemplateService {
```

To:

```java
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 策略模板服务 ...
 */
@Service
public class StrategyTemplateService {
```

- [ ] **Step 5: Verify full compilation**

Run: `cd backend && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit controller + service Spring DI changes**

```bash
git add backend/src/main/java/com/example/compound/controller/v2/StrategyController.java
git add backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java
git add backend/src/main/java/com/example/compound/service/v2/StrategyTemplateService.java
git commit -m "feat: convert v2 services and controller to Spring-managed beans with DI"
```

---

### Task 7: Integration Verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Start Spring Boot and verify context loads**

Run: `cd backend && mvn spring-boot:run`

Wait for `Started CompoundApplication in X seconds`. Confirm no `BeanCreationException` or datasource errors.

- [ ] **Step 2: Test the API endpoint returns data (with empty DB)**

```bash
curl -s http://localhost:8080/api/v2/strategies/templates | head -c 200
```

Expected: JSON array with 3 strategy templates (this endpoint doesn't hit DB).

```bash
curl -s -X POST http://localhost:8080/api/v2/strategies/screen \
  -H "Content-Type: application/json" \
  -d '{"strategyCode":"LOW_VALUATION","page":1,"pageSize":10}'
```

Expected: Returns `{"total":0,"page":1,"pageSize":10,"items":[]}` when DB has no data (empty table), no crash.

- [ ] **Step 3: Run the Python fetch script to populate data**

```bash
cd backend && pip install akshare && python ../scripts/fetch_stocks.py
```

Wait for completion. Confirm output shows `[OK] 成功写入 N 条记录` with N ~5000.

- [ ] **Step 4: Test screen API with real data**

```bash
curl -s -X POST http://localhost:8080/api/v2/strategies/screen \
  -H "Content-Type: application/json" \
  -d '{"strategyCode":"LOW_VALUATION","page":1,"pageSize":5}' | python -m json.tool
```

Expected: Returns `total > 0` with actual stock items. Each item should have `symbol`, `name`, `peTtm`, `pb`, `roe`, `isSt`, `isSuspended` fields.

- [ ] **Step 5: Verify ST stocks are excluded**

Query the DB directly to verify no ST stocks appear in LOW_VALUATION results:

```bash
sqlite3 backend/data/compound.db "SELECT COUNT(*) FROM stocks WHERE is_st=1"
```

Then confirm screened results contain zero ST stocks by checking output items' `isSt` fields are all `false`.

- [ ] **Step 6: Commit all verification evidence — no code changes**

(Verification complete, no commit needed unless adjustments were made.)

---

### Summary

| Task | Files | Commit Message |
|------|-------|---------------|
| 1 | `scripts/fetch_stocks.py` (create) | `feat: add Python data collection script (akshare → SQLite)` |
| 2 | `pom.xml`, `application.properties` | `feat: add sqlite-jdbc and configure SQLite datasource` |
| 3 | `StockItemDto.java` | `feat: add isSt, isSuspended, listingDays fields` |
| 4 | `StockRepository.java` (create) | `feat: add StockRepository with JdbcTemplate-backed queries` |
| 5 | `StockScreeningService.java` | `feat: switch to StockRepository with real exclusion rules` |
| 6 | `StrategyController.java`, `*Service.java` | `feat: convert v2 services/controller to Spring DI beans` |
| 7 | (verification) | (no commit) |

**Post-implementation:** MockStockDataProvider.java is retained for unit test use (no deletion). Frontend requires zero changes.

**Scheduling setup (manual, not in code):** After implementation, configure Windows Task Scheduler or cron to run `python scripts/fetch_stocks.py` each trading day at 15:30 CST.
