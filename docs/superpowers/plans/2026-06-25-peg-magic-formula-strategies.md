# PEG 估值 + 魔法公式策略 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在选股策略模块新增 PEG 估值和魔法公式 2 个策略模板

**Architecture:** 纯后端变更 — 扩展 `StrategyTemplateService`（模板定义）和 `StockScreeningService`（筛选/排序/文案），在 `StockItemDto` 添加 PEG 计算属性。不涉及数据库、前端、数据采集变更。

**Tech Stack:** Java 17, Spring Boot 3.4.1, JdbcTemplate → SQLite

## Global Constraints

- 不新增数据库字段
- 不修改前端代码（策略列表由现有 API 动态返回）
- 不修改 `fetch_stocks.py` 数据采集脚本
- 遵循现有 switch-case 模式扩展，不重构架构
- PEG 为计算字段（peTtm / profitGrowth），不在数据库存储

---

## File Structure

```
backend/src/main/java/com/example/compound/
├── dto/v2/
│   └── StockItemDto.java          # 修改：添加 getPeg() 计算属性
├── service/v2/
│   ├── StrategyTemplateService.java  # 修改：新增 2 个模板定义
│   └── StockScreeningService.java    # 修改：新增筛选/排序/文案逻辑
```

---

### Task 1: StockItemDto — 添加 PEG 计算属性

**Files:**
- Modify: `backend/src/main/java/com/example/compound/dto/v2/StockItemDto.java`

**Interfaces:**
- Produces: `public Double getPeg()` — 返回 peTtm / profitGrowth，任一为 null 或 profitGrowth ≤ 0 时返回 null

- [ ] **Step 1: 在 StockItemDto 添加 getPeg() 方法**

在文件末尾（最后一个 `}` 之前）添加：

```java
/**
 * 计算 PEG（市盈率相对盈利增长比率）。
 * PEG = PE(TTM) ÷ 净利润增长率(%)。
 * 返回 null 当数据缺失或增速 ≤ 0（PEG 无意义）。
 */
public Double getPeg() {
    if (peTtm == null || profitGrowth == null || profitGrowth <= 0) {
        return null;
    }
    return peTtm / profitGrowth;
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/example/compound/dto/v2/StockItemDto.java
git commit -m "feat: add getPeg() computed property to StockItemDto"
```

---

### Task 2: StrategyTemplateService — 新增两个策略模板定义

**Files:**
- Modify: `backend/src/main/java/com/example/compound/service/v2/StrategyTemplateService.java`

**Interfaces:**
- Consumes: `StockItemDto.getPeg()` (from Task 1)
- Produces: 新常量 `PEG_VALUATION`, `MAGIC_FORMULA`；扩展 `TEMPLATES` 列表和 `getTemplateDetail()` switch

- [ ] **Step 1: 添加策略编码常量**

在现有常量下方（`QUALITY_GROWTH` 行后）添加：

```java
public static final String PEG_VALUATION = "PEG_VALUATION";
public static final String MAGIC_FORMULA = "MAGIC_FORMULA";
```

- [ ] **Step 2: 在 TEMPLATES 列表追加两个模板**

在 `QUALITY_GROWTH` 模板条目后（`)` 闭合前）追加：

```java
            ,
            new StrategyTemplateDto(
                    PEG_VALUATION,
                    "PEG估值",
                    "用PEG指标（市盈率÷盈利增长率）寻找成长被低估的股票 — PEG<1 表示成长可能被市场低估"
            ),
            new StrategyTemplateDto(
                    MAGIC_FORMULA,
                    "魔法公式",
                    "彼得·林奇经典策略 — 结合高资本回报率(ROE)与高盈利收益率(1/PE)，寻找又好又便宜的公司"
            )
```

- [ ] **Step 3: 在 getTemplateDetail() switch 添加两个 case**

在 `QUALITY_GROWTH` case 后追加：

```java
case PEG_VALUATION -> Optional.of(buildPegValuationDetail());
case MAGIC_FORMULA -> Optional.of(buildMagicFormulaDetail());
```

- [ ] **Step 4: 添加 buildPegValuationDetail() 方法**

在 `buildQualityGrowthDetail()` 方法后添加：

```java
private TemplateDetailDto buildPegValuationDetail() {
    TemplateDetailDto d = new TemplateDetailDto();
    d.setCode(PEG_VALUATION);
    d.setName("PEG估值");
    d.setExplanation("该策略用PEG（市盈率÷盈利增长率）寻找成长被低估的公司。"
            + "适用场景：关注成长性价比、希望避免为高增长支付过高溢价的用户。");
    d.setRiskNote("PEG依赖历史盈利增速，未来增速放缓会导致PEG升高；增速为负时PEG无意义。");
    Map<String, Object> filters = new LinkedHashMap<>();
    filters.put("maxPeg", 1.0);
    filters.put("minRoe", 10);
    filters.put("minProfitGrowth", 10);
    filters.put("maxPe", 50);
    filters.put("excludeSt", true);
    filters.put("excludeSuspended", true);
    filters.put("minListingDays", 180);
    d.setFilters(filters);
    return d;
}
```

- [ ] **Step 5: 添加 buildMagicFormulaDetail() 方法**

```java
private TemplateDetailDto buildMagicFormulaDetail() {
    TemplateDetailDto d = new TemplateDetailDto();
    d.setCode(MAGIC_FORMULA);
    d.setName("魔法公式");
    d.setExplanation("彼得·林奇经典策略：好公司（高ROE）+ 好价格（高盈利收益率=1/PE）。"
            + "适用场景：偏好基本面质量且在意买入价格的用户。");
    d.setRiskNote("ROE可能包含非经常性收益；低PE可能反映市场对盈利持续性的质疑。");
    Map<String, Object> filters = new LinkedHashMap<>();
    filters.put("minRoe", 15);
    filters.put("maxPe", 25);
    filters.put("maxDebtRatio", 50);
    filters.put("excludeSt", true);
    filters.put("excludeSuspended", true);
    filters.put("minListingDays", 365);
    d.setFilters(filters);
    return d;
}
```

- [ ] **Step 6: 提交**

```bash
git add backend/src/main/java/com/example/compound/service/v2/StrategyTemplateService.java
git commit -m "feat: add PEG_VALUATION and MAGIC_FORMULA strategy templates"
```

---

### Task 3: StockScreeningService — 新增筛选逻辑

**Files:**
- Modify: `backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java`

**Interfaces:**
- Consumes: `StrategyTemplateService.PEG_VALUATION`, `StrategyTemplateService.MAGIC_FORMULA` (from Task 2)
- Produces: `passesPegValuation()`, `passesMagicFormula()` 方法

- [ ] **Step 1: 扩展 passesStrategyFilters() switch**

在 `QUALITY_GROWTH` case 后、`default` 前添加：

```java
case StrategyTemplateService.PEG_VALUATION -> passesPegValuation(s, filters);
case StrategyTemplateService.MAGIC_FORMULA -> passesMagicFormula(s, filters);
```

- [ ] **Step 2: 添加 passesPegValuation() 方法**

在 `passesQualityGrowth()` 方法后添加：

```java
private boolean passesPegValuation(StockItemDto s, Map<String, Object> filters) {
    // 亏损公司 PEG 无意义
    if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
    // 负增速 PEG 无意义
    if (s.getProfitGrowth() != null && s.getProfitGrowth() <= 0) return false;
    // PEG 检查
    Double maxPeg = getDouble(filters, "maxPeg");
    Double peg = s.getPeg();
    if (maxPeg != null && peg != null && peg > maxPeg) return false;
    // ROE 门槛
    if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
    // 增速门槛
    if (exceeds(s.getProfitGrowth(), getDouble(filters, "minProfitGrowth"), false)) return false;
    // PE 上限
    if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
    return true;
}
```

- [ ] **Step 3: 添加 passesMagicFormula() 方法**

```java
private boolean passesMagicFormula(StockItemDto s, Map<String, Object> filters) {
    // 亏损公司排除
    if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
    // 高质量：ROE 门槛
    if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
    // 好价格：PE 上限
    if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
    // 杠杆控制
    if (exceeds(s.getDebtRatio(), getDouble(filters, "maxDebtRatio"), true)) return false;
    return true;
}
```

- [ ] **Step 4: 提交**

```bash
git add backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java
git commit -m "feat: add PEG and Magic Formula filtering logic"
```

---

### Task 4: StockScreeningService — 排序、入选原因、风险标签

**Files:**
- Modify: `backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java`

**Interfaces:**
- Consumes: `StockItemDto.getPeg()` (from Task 1), `passesPegValuation()` / `passesMagicFormula()` (from Task 3)

- [ ] **Step 1: 扩展 getDefaultSortField() switch**

在 `QUALITY_GROWTH` case 后、`default` 前添加：

```java
case StrategyTemplateService.PEG_VALUATION -> "peg";
case StrategyTemplateService.MAGIC_FORMULA -> "roe";
```

- [ ] **Step 2: 扩展 getDefaultSortDirection() switch**

在 `QUALITY_GROWTH` case 后、`default` 前添加：

```java
case StrategyTemplateService.PEG_VALUATION -> "asc";
case StrategyTemplateService.MAGIC_FORMULA -> "desc";
```

- [ ] **Step 3: 在 sortStocks() 中添加 PEG 排序支持**

在现有 `sortStocks()` 方法的 switch 中，`default` 前添加：

```java
case "peg" -> Comparator.comparing(StockItemDto::getPeg, nullSafeComparator(desc));
```

- [ ] **Step 4: 扩展 generateReason() switch**

在 `QUALITY_GROWTH` case 后、`default` 前添加：

```java
case StrategyTemplateService.PEG_VALUATION -> {
    Double peg = s.getPeg();
    String pegStr = peg != null ? String.format("%.2f", peg) : "N/A";
    yield String.format("PEG=%s（PE=%s÷增速%s%%），成长相对估值偏低",
            pegStr, fmtD(s.getPeTtm()), fmtD(s.getProfitGrowth()));
}
case StrategyTemplateService.MAGIC_FORMULA -> {
    Double ey = s.getPeTtm() != null && s.getPeTtm() > 0
            ? 100.0 / s.getPeTtm() : null;
    yield String.format("ROE=%s%%且盈利收益率=%s%%（PE=%s），兼备质量与价格",
            fmtD(s.getRoe()),
            ey != null ? String.format("%.1f", ey) : "缺失",
            fmtD(s.getPeTtm()));
}
```

- [ ] **Step 5: 扩展 generateRiskTags() 中的策略专属风险**

在 `QUALITY_GROWTH` case 块后添加：

```java
case StrategyTemplateService.PEG_VALUATION -> {
    if (pg != null && pg < 15 && pg > 0) {
        tags.add("盈利增速放缓风险");
    }
    if (s.getPeg() != null && s.getPeg() > 0.8) {
        tags.add("成长性价比不足风险");
    }
}
case StrategyTemplateService.MAGIC_FORMULA -> {
    if (dr != null && dr > 50) {
        tags.add("杠杆率风险");
    }
    if (pe != null && pe < 5) {
        tags.add("低PE陷阱风险");
    }
}
```

- [ ] **Step 6: 提交**

```bash
git add backend/src/main/java/com/example/compound/service/v2/StockScreeningService.java
git commit -m "feat: add PEG and Magic Formula sorting, reasons, and risk tags"
```

---

### Task 5: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
cd backend && mvn spring-boot:run
```

- [ ] **Step 2: 验证策略模板列表 API 返回 5 个模板**

```bash
curl -s http://localhost:8080/api/v2/strategies/templates | python -c "import sys,json; data=json.load(sys.stdin); [print(t['code'], t['name']) for t in data]"
```

预期输出（顺序可能不同）：
```
LOW_VALUATION 低估值
HIGH_DIVIDEND 高股息
QUALITY_GROWTH 质量成长
PEG_VALUATION PEG估值
MAGIC_FORMULA 魔法公式
```

- [ ] **Step 3: 验证 PEG 模板详情**

```bash
curl -s http://localhost:8080/api/v2/strategies/templates/PEG_VALUATION | python -c "import sys,json; d=json.load(sys.stdin); print(d['name']); print(d['filters'])"
```

预期：返回 PEG估值 名称和包含 `maxPeg`, `minRoe`, `minProfitGrowth`, `maxPe` 的 filters

- [ ] **Step 4: 验证魔法公式模板详情**

```bash
curl -s http://localhost:8080/api/v2/strategies/templates/MAGIC_FORMULA | python -c "import sys,json; d=json.load(sys.stdin); print(d['name']); print(d['filters'])"
```

预期：返回 魔法公式 名称和包含 `minRoe`, `maxPe`, `maxDebtRatio` 的 filters

- [ ] **Step 5: 验证 PEG 筛选返回结果**

```bash
curl -s -X POST http://localhost:8080/api/v2/strategies/screen -H "Content-Type: application/json" -d "{\"strategyCode\":\"PEG_VALUATION\",\"page\":1,\"pageSize\":5}" | python -c "import sys,json; d=json.load(sys.stdin); print(f'total={d[\"total\"]}'); [print(f'{i[\"symbol\"]} {i[\"name\"]} reason={i.get(\"reason\",\"N/A\")} risks={i.get(\"riskTags\",[])}') for i in d['items']]"
```

预期：返回筛选结果，每只股票有 PEG 相关的 reason 和 riskTags（数据为空时 `total=0` 也是合理的）

- [ ] **Step 6: 验证魔法公式筛选返回结果**

```bash
curl -s -X POST http://localhost:8080/api/v2/strategies/screen -H "Content-Type: application/json" -d "{\"strategyCode\":\"MAGIC_FORMULA\",\"page\":1,\"pageSize\":5}" | python -c "import sys,json; d=json.load(sys.stdin); print(f'total={d[\"total\"]}'); [print(f'{i[\"symbol\"]} {i[\"name\"]} reason={i.get(\"reason\",\"N/A\")} risks={i.get(\"riskTags\",[])}') for i in d['items']]"
```

预期：返回筛选结果，每只股票有魔法公式相关的 reason 和 riskTags

- [ ] **Step 7: 停掉后端，提交（如有测试数据验证的修正）**

```bash
# 如果有任何修正，提交它们
git status
```
