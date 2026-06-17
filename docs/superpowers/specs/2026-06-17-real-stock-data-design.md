# 真实 A 股数据接入设计

**日期**: 2026-06-17  
**状态**: 已批准  
**目标**: 将选股策略模块从硬编码 Mock 数据切换为每日自动更新的真实 A 股数据

## 1. 问题

当前 `MockStockDataProvider.java` 包含 20 只手工编造的股票数据，数据不真实且永远不会更新。需要替换为覆盖全 A 股的真实行情与财务数据，每个交易日自动刷新。

## 2. 约束

- **零预算**: 数据源必须免费
- **T+1 更新**: 每个交易日收盘后（15:30）更新一次
- **技术栈**: 推荐方案即可，不限制

## 3. 方案选择

**选定方案: Java + Python 采集脚本 + SQLite**

备选方案及选择理由见讨论记录。核心权衡:
- akshare 是免费 A 股数据领域最成熟的开源 Python 库
- SQLite 零安装零配置，单文件管理
- Python 脚本和 Java 后端仅通过数据库文件通信，完全解耦

## 4. 架构

```
定时任务 (Windows 任务计划程序 / cron)
  每个交易日 15:30 触发
        ↓
Python 脚本 (akshare + sqlite3)
  - 拉取全 A 股行情
  - 拉取财务指标
  - 事务写入 SQLite
        ↓
SQLite (backend/data/compound.db)
  stocks 表 — 全 A 股数据
  data_log 表 — 更新记录
        ↓
Spring Boot (Java)
  StockRepository → JdbcTemplate 查询
  StockScreeningService → 筛选/排序/分页 (逻辑不变)
  StrategyController → REST API (不变)
        ↓
React 前端 (不变)
```

关键设计决策:
- Python 和 Java 只通过数据库通信，互不依赖
- 采集失败不影响查询——读取上一次成功更新的数据
- 事务保护全量刷新，不会出现半个更新

## 5. 数据库设计

### stocks 表

```sql
CREATE TABLE stocks (
    symbol          TEXT PRIMARY KEY,   -- 股票代码
    name            TEXT NOT NULL,       -- 股票名称
    industry        TEXT,                -- 申万一级行业
    price           REAL,                -- 最新收盘价
    pe_ttm          REAL,                -- PE(TTM)
    pb              REAL,                -- 市净率(LF)
    roe             REAL,                -- ROE(%)
    revenue_growth  REAL,                -- 营收同比增长(%)
    profit_growth   REAL,                -- 净利润同比增长(%)
    dividend_yield  REAL,                -- 近12月股息率(%)
    market_cap      REAL,                -- 总市值(亿元)
    debt_ratio      REAL,                -- 资产负债率(%)
    is_st           INTEGER DEFAULT 0,   -- 是否ST
    is_suspended    INTEGER DEFAULT 0,   -- 是否停牌
    listing_days    INTEGER,             -- 上市天数
    updated_at      TEXT                 -- 本条更新时间
);
```

索引: `pe_ttm`, `roe`, `industry` — 覆盖三个策略模板的核心筛选字段

### data_log 表

```sql
CREATE TABLE data_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at      TEXT,
    stock_count INTEGER,
    status      TEXT,       -- SUCCESS / PARTIAL / FAILED
    error_msg   TEXT
);
```

## 6. Python 采集脚本

**文件**: `scripts/fetch_stocks.py`  
**依赖**: `akshare` (仅此一个非标准库依赖)  
**数据库**: `sqlite3` (Python 标准库)

### 流程

```
1. 连接 SQLite，开启 WAL 模式
2. akshare.stock_zh_a_spot_em() → 全 A 股实时行情
3. akshare 财务指标接口 → PE/PB/ROE/增长/股息率
4. 合并清洗 → 计算衍生字段
5. BEGIN → DELETE ALL → INSERT ALL → INSERT log → COMMIT
6. 输出统计
```

### 数据清洗规则

- ST 判断: 名称含 "ST" 或 "*ST" → is_st=1
- 停牌判断: 价格为 0 或 null → is_suspended=1
- 上市天数: 从上市日期计算
- 缺失值: 财务指标缺失时设为 null（筛选时跳过）
- 异常值: PE > 10000 或负 PE 但未 ST 的保留原值，不做修改

## 7. Java 后端改动

### 7.1 pom.xml 新增依赖

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

### 7.2 application.properties 追加

```properties
spring.datasource.url=jdbc:sqlite:data/compound.db
spring.datasource.driver-class-name=org.sqlite.JDBC
```

### 7.3 StockItemDto 追加 3 个字段

```java
private boolean isSt;
private boolean isSuspended;
private int listingDays;
// + getters/setters
```

### 7.4 新增 StockRepository

```java
@Repository
public class StockRepository {
    private final JdbcTemplate jdbc;
    
    // 构造器注入
    public StockRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    
    // getAllStocks() — 与旧 MockStockDataProvider 接口一致
    // 使用 RowMapper 将 ResultSet → StockItemDto
}
```

### 7.5 StockScreeningService 改动

- `MockStockDataProvider.getAllStocks()` → `stockRepository.getAllStocks()`
- 排除规则改为读取 `isSt()` / `isSuspended()` / `getListingDays()` 真实字段
- 其余筛选/排序/分页/生成 reason/生成 riskTags 逻辑完全不变

### 7.6 StrategyController 改动

- 构造器注入 `StockRepository`，传入 `StockScreeningService`（当前是手动 new，改为注入）
- 或改为 Spring 托管 Bean（推荐）

## 8. 改动量汇总

| 文件 | 操作 | 预计代码量 |
|------|------|-----------|
| `scripts/fetch_stocks.py` | 新增 | ~120 行 |
| `pom.xml` | 改 | +2 依赖 |
| `application.properties` | 改 | +3 行 |
| `StockItemDto.java` | 改 | +3 字段 + getter/setter |
| `StockRepository.java` | 新增 | ~50 行 |
| `StockScreeningService.java` | 改 | ~10 行 |
| `StrategyController.java` | 改 | ~5 行 |

前端零改动。MockStockDataProvider 可保留用于单元测试。

## 9. 风险与缓解

| 风险 | 缓解 |
|------|------|
| akshare 接口变更 | 脚本跑失败时记录日志，Java 继续读旧数据；接口变更通常有社区提前通知 |
| 东方财富源数据缺失某些字段 | 脚本中 try/except 按字段降级，能拉多少拉多少 |
| SQLite 并发读写冲突 | WAL 模式支持一写多读；采集窗口（~30s）内查询会等到写完成 |
| 数据量增长 | 全 A 股 ~5000 条，SQLite 轻松承载；全量筛选在 Java 内存中完成 |

## 10. 后续扩展 (不在本次范围内)

- SQLite → PostgreSQL 平滑迁移（仅改数据源配置和驱动）
- 增加历史数据表，支持回溯和回测
- 前端增加"数据更新时间"展示
- 支持多种数据源切换（baostock 备用）
