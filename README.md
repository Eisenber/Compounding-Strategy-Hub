# 复利选股 · Compound Stock Selection

<p align="center">
  <strong>面向 A 股新手投资者的复利教育与选股辅助工具</strong><br>
  <sub>Compound Interest Comparison · Strategy-Based Stock Screening · RAG Knowledge Q&A</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/java-17%2B-orange" alt="Java">
  <img src="https://img.shields.io/badge/spring--boot-3.4.1-green" alt="Spring Boot">
  <img src="https://img.shields.io/badge/react-18-blue" alt="React">
  <img src="https://img.shields.io/badge/vite-5-purple" alt="Vite">
  <img src="https://img.shields.io/badge/python-3.9%2B-yellow" alt="Python">
  <img src="https://img.shields.io/badge/database-sqlite-lightgrey" alt="SQLite">
</p>

---

## 📖 目录

- [项目简介](#项目简介)
- [功能概览](#功能概览)
- [技术架构](#技术架构)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [数据流水线](#数据流水线)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [免责声明](#免责声明)

---

## 项目简介

**复利选股** 是一个本地化的 A 股投资学习工具，定位为**教育辅助**而非量化交易平台。它帮助投资新手：

1. **理解复利效应** — 同时比较最多 5 种投资方案，直观感受收益率、费率和通胀对长期资产的影响
2. **学习选股逻辑** — 通过 3 种经典策略模板筛选全 A 股，理解 PE、PB、ROE、股息率等核心指标
3. **查阅投资知识** — 基于本地文档的 RAG 知识库问答，用 AI 辅助理解项目文档和投资概念

> ⚠️ **本工具仅用于信息展示与学习参考，不构成任何投资建议。投资有风险，入市需谨慎。**

---

## 功能概览

### V1 · 复利对比

| 功能 | 说明 |
|------|------|
| 多方案对比 | 同时输入 2-5 个投资方案（如：银行定存、债券基金、沪深300 ETF） |
| 参数配置 | 初始本金、月定投金额、投资年限、年化收益率、年费率、通胀率 |
| 计算结果 | 总投入、最终资产、总收益、收益倍数、实际购买力（扣除通胀） |
| 年度曲线 | Recharts 折线图展示各方案每年资产变化趋势 |
| 智能洞察 | 根据对比结果自动生成 2-3 条结论（最佳收益、费率影响、定投效应） |

### V2 · 选股策略

| 策略模板 | 核心条件 | 适用场景 |
|----------|---------|---------|
| **低估值** | PE ≤ 15, PB ≤ 1.8, ROE ≥ 8%, 利润增长 ≥ 0 | 寻找被市场低估的优质公司 |
| **高股息** | 股息率 ≥ 4%, ROE ≥ 8%, 负债率 ≤ 70% | 追求稳定现金分红回报 |
| **质量成长** | ROE ≥ 12%, 营收增长 ≥ 15%, 利润增长 ≥ 15%, 负债率 ≤ 60%, PE ≤ 40 | 筛选盈利与成长兼备的公司 |

每只筛选出的股票附带**入选原因**和**风险标签**，支持自定义筛选阈值、排序和分页。

### 数据新鲜度

- 每个交易日 15:30 自动拉取最新行情与财务数据
- 界面实时显示**数据更新时间**和新鲜度状态
- 支持点击按钮**手动触发刷新**

### 知识库问答 (RAG)

- 本地文档索引（Markdown → 分块 → BM25 检索）
- 支持 LLM 生成答案（DeepSeek 等 OpenAI 兼容 API）
- LLM 不可用时自动降级为关键词检索模式

---

## 技术架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (:3000)                  │
│         React 18 + Vite 5 + Tailwind CSS 3          │
│         Recharts · lucide-react · React Router       │
└────────────────────┬────────────────────────────────┘
                     │  /api proxy
┌────────────────────▼────────────────────────────────┐
│                   Backend (:8080)                    │
│            Java 17 · Spring Boot 3.4.1              │
│     ┌──────────┬─────────────┬────────────────┐     │
│     │  V1 API  │   V2 API    │  Knowledge API │     │
│     │ /health  │ /strategies │  /knowledge    │     │
│     │ /compare │ /data-status│  /reindex      │     │
│     │          │ /refresh    │                │     │
│     └──────────┴─────────────┴────────────────┘     │
│                      │                              │
│              JdbcTemplate → SQLite                   │
└────────────────────┬────────────────────────────────┘
                     │  reads from
┌────────────────────▼────────────────────────────────┐
│            Data Pipeline (scheduled)                 │
│            Python 3 · akshare · requests             │
│                                                     │
│  Tencent API ─┐                                     │
│  akshare ─────┼─→ fetch_stocks.py ─→ compound.db    │
│  Eastmoney ───┘                                     │
└─────────────────────────────────────────────────────┘
```

### 数据流

1. **Python 脚本** (`scripts/fetch_stocks.py`) 从腾讯行情、akshare、东方财富数据中心拉取全 A 股数据
2. 数据写入 **SQLite** (`backend/data/compound.db`)，WAL 模式支持并发读写
3. **Spring Boot** 通过 JdbcTemplate 读取，在内存中完成筛选/排序/分页
4. 调度方式：Spring `@Scheduled`（交易日 15:30）+ 手动 API 触发

---

## 快速开始

### 环境要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| JDK | 17+ | 推荐 21 |
| Maven | 3.8+ | 后端构建 |
| Node.js | 18+ | 前端构建 |
| Python | 3.9+ | 数据采集脚本 |
| pip | - | 需安装 akshare |

### 1. 克隆项目

```bash
git clone <repo-url>
cd 复利选股
```

### 2. 启动后端

```bash
cd backend
mvn spring-boot:run
# 后端运行在 http://localhost:8080
# 验证: curl http://localhost:8080/api/health
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
# Vite 自动将 /api 请求代理到后端 8080 端口
```

### 4. 初始化数据（可选）

首次使用时数据可能为空，运行以下命令拉取全 A 股行情与财务数据：

```bash
pip install akshare
python scripts/fetch_stocks.py
```

> ⚠️ 脚本需约 2-3 分钟，期间会从多个 API 分批拉取约 5500 只 A 股数据。

### 5. 配置 LLM（可选）

如需使用知识库问答的 AI 生成功能，创建 `backend/config/application-secrets.properties`：

```properties
app.rag.llm.api-key=your-api-key
app.rag.llm.model=deepseek-chat
app.rag.llm.base-url=https://api.deepseek.com/v1
```

---

## API 文档

### 基础

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 → `{"status":"ok"}` |

### V1 · 复利对比

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/compound/compare` | 执行复利方案对比 |

<details>
<summary>请求/响应示例</summary>

**请求：**
```json
{
  "scenarios": [
    {
      "name": "银行定存",
      "initialPrincipal": 100000,
      "monthlyContribution": 5000,
      "years": 10,
      "annualReturnRate": 2.5,
      "annualFeeRate": 0,
      "inflationRate": 2.0
    },
    {
      "name": "沪深300 ETF",
      "initialPrincipal": 100000,
      "monthlyContribution": 5000,
      "years": 10,
      "annualReturnRate": 8.0,
      "annualFeeRate": 0.5,
      "inflationRate": 2.0
    }
  ]
}
```

**响应：**
```json
{
  "bestScenarioName": "沪深300 ETF",
  "scenarios": [
    {
      "name": "银行定存",
      "totalInvested": 700000,
      "finalAmount": 796483.50,
      "totalProfit": 96483.50,
      "profitMultiple": 1.14,
      "realFinalAmount": 653400.21,
      "yearlyPoints": [{"year": 0, "amount": 100000}, ...]
    }
  ],
  "insights": [
    "沪深300 ETF 的 10 年实际购买力比 银行定存 高出 ¥284,301",
    ...
  ]
}
```
</details>

### V2 · 选股策略

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v2/strategies/templates` | 策略模板列表 |
| `GET` | `/api/v2/strategies/templates/{code}` | 模板详情（含默认筛选条件） |
| `POST` | `/api/v2/strategies/screen` | 执行股票筛选 |
| `GET` | `/api/v2/strategies/data-status` | 数据新鲜度状态 |
| `POST` | `/api/v2/strategies/refresh` | 手动触发数据刷新 |

<details>
<summary>筛选请求示例</summary>

```json
{
  "strategyCode": "LOW_VALUATION",
  "filters": {
    "maxPe": 15,
    "maxPb": 1.8,
    "minRoe": 8,
    "minProfitGrowth": 0,
    "excludeSt": true,
    "excludeSuspended": true,
    "minListingDays": 180
  },
  "sortBy": "peTtm",
  "sortDirection": "asc",
  "page": 1,
  "pageSize": 20
}
```
</details>

### 知识库

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/knowledge/ask` | 知识库问答 |
| `POST` | `/api/v1/knowledge/reindex` | 重建文档索引 |

---

## 数据流水线

### 数据源

| 数据 | 来源 | API/库 |
|------|------|--------|
| 股票列表 | Sina 财经 | akshare `stock_zh_a_spot` |
| 实时价格 / PE(TTM) / PB / 总市值 | 腾讯行情 | `qt.gtimg.cn` |
| ROE / 营收增长 / 利润增长 / 行业 | akshare | `stock_yjbb_em` |
| 资产负债率 | 东方财富数据中心 | `RPT_DMSK_FN_BALANCE` |
| 上市日期 / 历史分红 | akshare | `stock_history_dividend` |

### 数据库结构

**stocks 表** — 全量 A 股行情与财务数据：

| 字段 | 类型 | 说明 |
|------|------|------|
| `symbol` | TEXT PK | 股票代码（6 位） |
| `name` | TEXT | 股票名称 |
| `price` | REAL | 最新价 |
| `pe_ttm` | REAL | 市盈率 (TTM) |
| `pb` | REAL | 市净率 |
| `roe` | REAL | 净资产收益率 (%) |
| `revenue_growth` | REAL | 营收增长率 (%) |
| `profit_growth` | REAL | 净利润增长率 (%) |
| `dividend_yield` | REAL | 股息率 (%) |
| `market_cap` | REAL | 总市值（亿元） |
| `debt_ratio` | REAL | 资产负债率 (%) |
| `industry` | TEXT | 所属行业 |
| `is_st` | INTEGER | 是否 ST |
| `is_suspended` | INTEGER | 是否停牌 |
| `listing_days` | INTEGER | 上市天数 |
| `updated_at` | TEXT | 更新时间 |

**data_log 表** — 数据刷新日志：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增 ID |
| `run_at` | TEXT | 执行时间 |
| `stock_count` | INTEGER | 成功拉取的股票数量 |
| `status` | TEXT | SUCCESS / FAILED |
| `error_msg` | TEXT | 失败时的错误信息 |

### 定时刷新

```properties
# 默认配置：每个交易日 15:30
data.refresh.schedule-cron=0 30 15 * * MON-FRI
data.refresh.timeout-minutes=5
data.refresh.schedule-enabled=true
```

执行流程：Spring `@Scheduled` → `ProcessBuilder` 调用 `python scripts/fetch_stocks.py --db-path <path>` → 写入 SQLite → 更新 data_log

并发保护：`AtomicBoolean` 确保同一时间只有一个刷新任务运行，重复请求返回 HTTP 409。

---

## 项目结构

```
复利选股/
├── backend/                              # Spring Boot 后端
│   ├── data/
│   │   └── compound.db                   # SQLite 数据库（由 Python 脚本写入）
│   ├── config/
│   │   └── application-secrets.properties # LLM API 密钥 (git-ignored)
│   └── src/main/java/com/example/compound/
│       ├── CompoundApplication.java      # 启动类 + @EnableScheduling
│       ├── config/
│       │   ├── CorsConfig.java           # CORS 配置
│       │   └── KnowledgeBaseProperties.java
│       ├── controller/
│       │   ├── CompoundController.java   # V1 复利对比
│       │   ├── HealthController.java     # 健康检查
│       │   ├── KnowledgeBaseController.java
│       │   └── v2/
│       │       └── StrategyController.java  # V2 选股 + 数据状态 + 刷新
│       ├── dto/
│       │   └── v2/
│       │       ├── DataStatusDto.java    # 数据状态 DTO
│       │       ├── ScreenRequestDto.java
│       │       ├── ScreenResponseDto.java
│       │       ├── StockItemDto.java
│       │       ├── StrategyTemplateDto.java
│       │       └── TemplateDetailDto.java
│       ├── repository/v2/
│       │   └── StockRepository.java      # JdbcTemplate 读取 SQLite
│       ├── service/
│       │   ├── CompoundServiceImpl.java  # 复利计算核心
│       │   ├── DataRefreshService.java   # 定时 + 手动数据刷新
│       │   ├── knowledge/
│       │   │   ├── KnowledgeBaseService.java
│       │   │   └── OpenAiCompatibleKnowledgeAnswerGenerator.java
│       │   └── v2/
│       │       ├── StockScreeningService.java
│       │       └── StrategyTemplateService.java
│       └── data/v2/
│           └── MockStockDataProvider.java # 单元测试用 Mock 数据
│
├── frontend/                             # React 前端
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx              # 首页
│       │   ├── ComparePage.jsx           # 复利对比
│       │   ├── StrategyPage.jsx          # 选股策略
│       │   └── KnowledgePage.jsx         # 知识库问答
│       ├── components/
│       │   ├── ScenarioForm.jsx          # 方案输入表单
│       │   ├── ResultCard.jsx            # 结果卡片
│       │   ├── ComparisonChart.jsx       # Recharts 折线图
│       │   ├── InsightsPanel.jsx         # 智能洞察面板
│       │   ├── StrategySelector.jsx      # 策略选择器
│       │   ├── FilterPanel.jsx           # 筛选条件面板
│       │   ├── StockTable.jsx            # 股票结果表格
│       │   ├── ReasonTooltip.jsx         # 入选原因弹窗
│       │   ├── RiskPanel.jsx             # 风险提示面板
│       │   └── DataFreshnessIndicator.jsx # 数据新鲜度指示器
│       └── services/
│           └── api.js                    # 全部 API 调用
│
├── scripts/
│   └── fetch_stocks.py                   # 全 A 股数据采集脚本
│
└── docs/
    ├── superpowers/specs/                # 设计规格文档
    └── bug-reports/                      # 问题诊断报告
```

---

## 配置说明

### 后端配置 (`application.properties`)

```properties
server.port=8080

# SQLite 数据库路径（相对于后端工作目录）
spring.datasource.url=jdbc:sqlite:data/compound.db

# 数据刷新调度
data.refresh.python-path=python
data.refresh.script-path=scripts/fetch_stocks.py
data.refresh.timeout-minutes=5
data.refresh.schedule-cron=0 30 15 * * MON-FRI

# RAG 知识库
app.rag.enabled=true
app.rag.source-paths[0]=docs
app.rag.max-chunk-length=900
app.rag.chunk-overlap=140
app.rag.default-top-k=5
```

### 前端配置 (`vite.config.js`)

```javascript
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 免责声明

> 本工具仅用于**股票信息筛选与展示**，不构成任何形式的投资建议。
>
> - 所有策略模板仅为经典投资理念的公式化表达，不代表任何收益承诺
> - 筛选结果中的股票可能包含数据缺失、行业偏差等局限性
> - 复利计算中的收益率假设无法预测未来实际表现
> - 请结合自身风险承受能力独立决策，必要时咨询专业持牌机构
>
> **投资有风险，入市需谨慎。过往业绩不预示未来表现。**

---

## License

MIT License — 仅供学习与研究使用。
