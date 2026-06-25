# PEG 估值 + 魔法公式策略 — 设计规约

**日期**: 2026-06-25
**状态**: 待审阅
**范围**: Phase 1 — 新增 2 个选股策略模板（PEG估值、魔法公式），不涉及数据库变更

---

## 1. 目标

在现有 3 个策略模板（低估值、高股息、质量成长）基础上，新增 2 个策略模板：
- **PEG 估值** — 用 PEG 指标寻找成长被低估的公司
- **魔法公式** — 结合高资本回报率与高盈利收益率，寻找"又好又便宜"的公司

## 2. 非目标（明确排除）

- 不新增数据库字段
- 不修改前端代码（策略列表由现有 API 自动展示）
- 不修改数据采集脚本
- 逆向反转、动量趋势策略（留给 Phase 2，需依赖数据扩展）

---

## 3. 策略详情

### 3.1 PEG 估值 (`PEG_VALUATION`)

**核心公式**: PEG = PE(TTM) ÷ 净利润增长率(%)

- PEG < 1.0 → 成长可能被市场低估
- PEG 越低，性价比越高

**默认筛选条件**:

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxPeg` | 1.0 | PEG 上限 |
| `minRoe` | 10 | ROE 不低于 10% |
| `minProfitGrowth` | 10 | 净利润增长率不低于 10%（确保 PEG 有意义的增长基数） |
| `maxPe` | 50 | PE 上限，排除极端高估值 |
| `excludeSt` | true | 排除 ST |
| `excludeSuspended` | true | 排除停牌 |
| `minListingDays` | 180 | 排除次新股 |

**默认排序**: `peg` 升序

**入选原因模板**: `"PEG={peg}（PE={pe}÷增速{pg}%），成长相对估值偏低"`

**风险标签**:
- `profitGrowth < 15` → "盈利增速放缓风险"
- `profitGrowth < 0` → "盈利下滑风险"（但会被过滤器排除）
- 行业为科技/医药等竞争行业 → "行业竞争风险"
- 默认兜底 → "数据失真风险"（增速下降时 PEG 会上升）

### 3.2 魔法公式 (`MAGIC_FORMULA`)

**理论基础**: 彼得·林奇"又好又便宜"理念。

简化实现：
- **"好"代理** → ROE 越高越好（近似 ROIC）
- **"便宜"代理** → 盈利收益率 = 1/PE 越高越好（即 PE 越低越好）

**默认筛选条件**:

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `minRoe` | 15 | 高质量门槛 |
| `maxPe` | 25 | 好价格门槛（盈利收益率 ≥ 4%） |
| `maxDebtRatio` | 50 | 控制杠杆风险 |
| `excludeSt` | true | 排除 ST |
| `excludeSuspended` | true | 排除停牌 |
| `minListingDays` | 365 | 排除上市不满一年的股票 |

**默认排序**: `roe` 降序

**入选原因模板**: `"ROE={roe}%且盈利收益率={ey}%（PE={pe}），兼备质量与价格"`

**风险标签**:
- `debtRatio > 50` → "杠杆率风险"
- `profitGrowth < 0` → "盈利下滑风险"
- `peTtm < 5` → "低PE陷阱风险"（极低PE可能反映市场对盈利持续性的质疑）
- 默认兜底 → "ROE非经常性扰动风险"

---

## 4. 实现范围

### 4.1 后端变更

**文件**: `StrategyTemplateService.java`
- 新增常量 `PEG_VALUATION = "PEG_VALUATION"`
- 新增常量 `MAGIC_FORMULA = "MAGIC_FORMULA"`
- 扩展 `TEMPLATES` 列表（+2 条）
- 扩展 `getTemplateDetail()` switch（+2 case）
- 新增 `buildPegValuationDetail()` 方法
- 新增 `buildMagicFormulaDetail()` 方法

**文件**: `StockScreeningService.java`
- 扩展 `passesStrategyFilters()` switch（+2 case）
- 新增 `passesPegValuation()` 方法
- 新增 `passesMagicFormula()` 方法
- 扩展 `generateReason()` switch（+2 case）
- 扩展 `generateRiskTags()` switch（+2 case）
- 扩展 `getDefaultSortField()` switch（PEG → `"peg"`, MF → `"roe"`）
- 扩展 `getDefaultSortDirection()` switch（PEG → `"asc"`, MF → `"desc"`）
- PEG 排序需要计算字段 — 在 `sortStocks()` 中为 PEG 添加计算比较器

**文件**: `StockItemDto.java`
- 不新增字段（PEG 按需计算）
- 考虑添加 `peg` 计算属性供前端用（可选，也可由前端从 peTtm/profitGrowth 自行计算）

### 4.2 前端变更

- 无需修改。策略列表由 `GET /api/v2/strategies/templates` 动态返回，前端下拉菜单自动包含新策略。
- 筛选面板 `FilterPanel.jsx` 可能需要新增 `maxPeg` 滑块组件（如 PEG 策略有特有参数），但现有 `FilterPanel` 若已支持动态渲染筛选条件则无需改动。

### 4.3 数据库

- 无变更。所有计算基于现有字段。

### 4.4 数据采集脚本

- 无变更。

---

## 5. 边界条件与错误处理

- **负 PE（亏损公司）**: PEG 无意义，直接过滤掉（同现有策略逻辑）
- **负增速**: PEG 为负数，无意义，过滤掉
- **极低增速（0~10%）**: PEG 会极大，自然被 `maxPeg` 滤掉
- **profitGrowth 为 null**: PEG 无法计算，跳过该股票
- **peTtm 为 null**: 无法计算 PEG 和盈利收益率，跳过

---

## 6. 测试要点

- PEG 计算精度（PE=15, 增速=30% → PEG=0.5）
- 负 PE 和负增速被排除
- null 字段股票被安全跳过
- 魔法公式同时满足高质量和好价格
- 策略列表 API 返回 5 个模板
- 模板详情 API 返回新策略的 filters 和文案
- 通用排除规则（ST/停牌/次新股）在新策略中生效
