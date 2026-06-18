# 错误诊断报告：选股筛选功能异常

> **日期**：2026-06-18  
> **报告人**：Claude Code 自动诊断  
> **严重程度**：🔴 严重（核心功能不可用）  
> **影响范围**：全部3个策略模板的财务指标筛选

---

## 1. 问题摘要

本次诊断共发现 **4 个问题**，其中 **1 个阻塞性 Bug**，**1 个数据缺口**，**1 个次要 Bug**，**1 个架构缺口**。

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| ① | 东方财富财务数据 API 失效 | 🔴 阻塞 | ROE/营收/利润/股息率/负债率全部为 NULL |
| ② | `listingDays` 数据缺失 | 🟡 中等 | 次新股过滤不生效 |
| ③ | 后端根路径返回 500 | 🟢 轻微 | 直接访问 `:8080/` 报错 |
| ④ | `StockItemDto` 装箱类型覆盖不完整 | 🟡 中等 | 编译通过但存在潜在风险 |

---

## 2. 详细分析

### 问题 ①：东方财富财务数据 API 失效（阻塞）

**根因**：`fetch_stocks.py:178-253` 调用的东方财富报告 API `RPT_DMSK_FN_YJBB` 已不存在。

**现状**：
- 数据库 `compound.db` 共 2691 只股票
- `roe` 非 NULL：**0 条**
- `revenue_growth` 非 NULL：**0 条**
- `profit_growth` 非 NULL：**0 条**
- `dividend_yield` 非 NULL：**0 条**
- `debt_ratio` 非 NULL：**0 条**
- `industry` 非 NULL：**0 条**

**API 测试结果**：

```
# 原 API（未过滤日期）
GET http://datacenter.eastmoney.com/api/data/v1/get
  ?reportName=RPT_DMSK_FN_YJBB
  &columns=...
  → {"success": false, "code": 9501, "message": "报表不存在"}

# 带日期的原 API
GET ... &filter=(REPORT_DATE='2026-03-31')
  → {"success": false}
GET ... &filter=(REPORT_DATE='2025-12-31')
  → {"success": false}

# 新版 API（datacenter-web）
GET https://datacenter-web.eastmoney.com/api/data/v1/get
  ?reportName=RPT_DMSK_FN_YJBB
  → {"success": false, "code": 9501, "message": "报表不存在"}
```

**结论**：东方财富数据中心的 `RPT_DMSK_FN_YJBB` 报表已下架或更名，需要寻找替代 API 或使用 akshare 库直接获取。

**连锁影响**：

| 受影响的功能 | 详情 |
|-------------|------|
| 低估值策略 | ROE≥8 筛选条件不生效；利润增长率筛选不生效 |
| 高股息策略 | 股息率≥4、ROE≥8、负债率≤70 筛选条件**全部不生效** |
| 质量成长策略 | ROE≥12、营收增长≥15、利润增长≥15、负债率≤60 筛选条件**全部不生效** |
| 前端表格 | ROE、营收增长、利润增长、股息率显示为 `-` |
| 入选原因 | 显示为 `ROE=缺失%、营收增长=缺失%...` |
| 风险标签 | 大量依赖 NULL 字段的风险标签无法生成，全部回退到"市场波动风险" |

**涉及文件**：
- [scripts/fetch_stocks.py:178-253](scripts/fetch_stocks.py#L178-L253) — `fetch_financial_data()` 函数
- [scripts/fetch_stocks.py:276-326](scripts/fetch_stocks.py#L276-L326) — `clean_and_merge()` 合并逻辑
- [scripts/fetch_stocks.py:346-350](scripts/fetch_stocks.py#L346-L350) — 写入数据库的列定义

---

### 问题 ②：`listingDays` 数据缺失

**根因**：`fetch_stocks.py:302` 有意设置为 `None`，注释写：
```python
# 上市天数 → 留空（需要逐个查询上市日期），默认 null
merged["listing_days"] = None
```

**影响**：
- 低估值策略的 `minListingDays: 180`（排除上市未满 180 天）这一过滤条件**完全无效**
- 后端 `StockScreeningService.isExcludedByCommonRules()` 中对 `listingDays` 的 NULL 有保护处理，但实质上跳过检查
- 次新股可能被错误地纳入低估值策略的筛选结果

**涉及文件**：
- [scripts/fetch_stocks.py:302](scripts/fetch_stocks.py#L302) — 数据获取
- [backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java:105-110](backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java#L105-L110) — 过滤逻辑

---

### 问题 ③：后端根路径返回 500

**现象**：访问 `http://localhost:8080/` 返回 HTTP 500：
```json
{
  "timestamp": "2026-06-18T10:23:59",
  "status": 500,
  "error": "服务器内部错误",
  "message": "No static resource ."
}
```

**根因**：Spring Boot 没有配置根路径的 Controller 或静态资源处理器。前端由 Vite 开发服务器（端口 3000）独立提供，后端只暴露 API。

**影响**：
- 开发环境：用户通过 `localhost:3000` 访问不受影响
- 生产环境：需要在 Spring Boot 中配置静态资源路径指向 `frontend/dist/`，或前端独立部署

**建议修复**：
- 添加一个简单的 `/` 重定向或 index 页面
- 或配置 `spring.web.resources.static-locations` 指向 `frontend/dist/`

---

### 问题 ④：`StockItemDto` 装箱类型覆盖不完整

**背景**：近期提交将 `StockItemDto` 的数值字段从原始类型改为装箱类型（`double` → `Double`，`int` → `Integer`），以支持 NULL 值。后端服务层也已添加相应的 NULL 检查。

**发现**：编译通过、API 正常运行，但以下位置需关注：

1. **前端排序列**：`StockTable.jsx:88-95` 的客户端排序使用 `(va - vb) * dir`，当值为 `null` 时会产生 `NaN`，但后端排序列在前端 `defaultSort` 中是固定的（如 PE、ROE），且前端排序只在用户点击列头时触发。

2. **前端格式化函数**：`StockTable.jsx:54-61` 的 `format` 回调已正确检查 `v != null`，无问题。

3. **后端排序**：`StockScreeningService.sortStocks()` 已使用 `Comparator.nullsLast()`，正确处理 NULL 值。

**结论**：当前风险较低（因为有 null 保护），但建议增加集成测试覆盖 NULL 数据场景。

---

## 3. 修复优先级建议

### Phase 1 — 紧急修复

**修复问题 ①**：更换财务数据 API

两种方案：

**方案 A（推荐）**：使用 `akshare` 库
```python
import akshare as ak

# 获取最新季度财务指标
df = ak.stock_yjbb_em(date="2026")  # 2026年最新季报
# 或
df = ak.stock_financial_analysis_indicator()
```

优点：akshare 封装的 API 会自动跟随东方财富的 API 变更
缺点：依赖 akshare 版本

**方案 B**：手动修复 API 调用

- 查找东方财富最新的报告 API 端点
- 更新 `reportName` 参数（可能已改为其他名称）
- 可能需要切换到 `https://datacenter-web.eastmoney.com/` 并使用新的认证方式

### Phase 2 — 功能完善

**修复问题 ②**：补充 `listingDays` 数据

使用 akshare 的 `ak.stock_info_a_code_name()` 或东方财富的上市日期 API 获取每只股票的上市天数。

### Phase 3 — 体验优化

**修复问题 ③**：为后端根路径添加处理

---

## 4. 当前数据状态

```
数据库：backend/data/compound.db
总记录数：2691 只股票
数据更新时间：2026-06-18 09:51:40

字段统计：
  symbol        ✓ (2691)
  name          ✓ (2691)
  price         ✓ (2691, ~12% 为停牌/NULL)
  pe_ttm        ✓ (2379, ~88%)
  pb            ✓ (2512, ~93%)
  market_cap    ✓ (2691)
  roe           ✗ (0 — 全部 NULL)
  revenue_growth ✗ (0)
  profit_growth  ✗ (0)
  dividend_yield ✗ (0)
  debt_ratio     ✗ (0)
  industry       ✗ (0)
  listing_days   ✗ (0)
  is_st         ✓ (2691)
  is_suspended  ✓ (2691)

data_log：
  [1] 2026-06-18 09:49:44 — FAILED — UNIQUE constraint failed: stocks.symbol
  [2] 2026-06-18 09:51:40 — SUCCESS — 2691 条
```

---

## 5. 附录：已验证正常的功能

| 功能 | 状态 | 说明 |
|------|------|------|
| 后端编译 | ✅ | Maven 编译通过 |
| 后端启动 | ✅ | Spring Boot 在 8080 端口正常运行 |
| Vite 开发服务器 | ✅ | 在 3000 端口运行，代理配置正确 |
| 模板列表 API | ✅ | `GET /api/v2/strategies/templates` 正常 |
| 筛选 API | ✅ | `POST /api/v2/strategies/screen` 正常（返回 113 条低估值结果） |
| PE / PB 筛选 | ✅ | 生效 |
| ST / 停牌过滤 | ✅ | 生效 |
| UTF-8 编码 | ✅ | API 响应编码正确 |
| 前端渲染 | ✅ | Vite 开发服务器正常提供页面 |
| API 代理 | ✅ | Vite → Spring Boot 代理正常 |
