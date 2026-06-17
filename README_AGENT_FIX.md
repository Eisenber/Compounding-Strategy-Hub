# README_AGENT_FIX

## 任务定位

你现在的任务不是重新生成项目，也不是扩展新功能。

你要做的是：

**基于当前 `E:\复利选股` 已有代码，按 `修复清单.md` 完成一次最小、可验证、可回归的修复。**

目标是让当前 MVP 回到：

- 页面可正常阅读
- 计算结果与规格一致
- 错误提示可用
- 前后端联调稳定

---

## 任务输入

执行前，先阅读并遵守以下文件：

1. `AGENTS.md`
2. `README_AGENT.md`
3. `修复清单.md`

本次修复的优先级以：

- `修复清单.md`

为最高执行依据。

如果 `AGENTS.md` 中的通用建议与 `修复清单.md` 冲突，以本文件和 `修复清单.md` 为准。

---

## 本次任务的唯一目标

不要扩展产品功能，不要新增第二版能力。

本次只做：

- 修复乱码
- 修复复利计算口径
- 修复错误提示展示
- 修复误导性排名展示
- 对齐 Java 版本
- 优化结论文案的真实性

如果某项工作不直接服务于上面 6 件事，就不要做。

---

## 严格禁止

本次禁止做以下事情：

- 新增选股页面
- 新增回测功能
- 新增数据库
- 重构成复杂架构
- 替换前端框架
- 替换后端框架
- 引入状态管理库
- 引入新的大型 UI 框架
- 修改 API 结构到与当前前端完全不兼容
- 借修复之名顺手扩需求

---

## 修复范围

仅允许修改与本次问题直接相关的文件。

优先关注：

### 后端

- `backend/pom.xml`
- `backend/src/main/java/com/example/compound/service/CompoundServiceImpl.java`
- `backend/src/main/java/com/example/compound/dto/ScenarioInput.java`
- `backend/src/main/java/com/example/compound/dto/CompareRequest.java`
- `backend/src/main/java/com/example/compound/exception/GlobalExceptionHandler.java`

### 前端

- `frontend/src/pages/ComparePage.jsx`
- `frontend/src/components/ScenarioForm.jsx`
- `frontend/src/components/ResultCard.jsx`
- `frontend/src/components/ComparisonChart.jsx`
- `frontend/src/services/api.js`

如果发现还有其他乱码文件，可以补充修复，但不要扩大到无关模块。

---

## 修复优先级

严格按下面顺序执行。

### 第一步：修乱码

完成标准：

- 页面上的中文全部正常
- 默认方案名正常
- 表单标签正常
- 按钮文案正常
- 后端校验错误信息正常
- 接口错误信息正常

执行要求：

- 所有相关源码统一保存为 `UTF-8`
- 不要把中文删掉后改成英文占位
- 不要把用户文案留成半成品

---

### 第二步：修复利计算口径

必须与既有规格保持一致：

- 默认每月末定投
- 月净收益率 = `(1 + annualReturnRate - annualFeeRate)^(1/12) - 1`

当前错误方向：

- 现有实现等价于月初定投

目标修复：

```java
currentAmount = currentAmount * (1 + monthlyNetRate);
currentAmount = currentAmount + input.getMonthlyContribution();
```

修完后确认：

- `finalAmount`
- `totalProfit`
- `profitMultiple`
- `realFinalAmount`
- `yearlyPoints`

都仍然结构稳定，前端无需大改即可消费。

---

### 第三步：修复错误提示解析

目标：

- 当前前端能正确展示后端 `messages` 数组中的错误内容

最低要求：

- 至少展示第一条后端校验错误

更好但非必须：

- 支持多条错误合并展示

---

### 第四步：修复误导性的排名展示

问题本质：

- 当前 rank 只是输入顺序，不是真实优劣

MVP 最优解：

- 去掉排名数字
- 保留“最优方案”高亮

除非你能保证排序逻辑和展示完全一致，否则不要保留 rank。

---

### 第五步：对齐 Java 版本

目标：

- `backend/pom.xml` 中 `java.version` 改为 `21`

注意：

- 如果本地环境无法编译 Java 21，请明确记录，不要偷偷改回 17

---

### 第六步：优化 insight 文案真实性

要求：

- 至少第一条结论必须基于当前比较结果生成
- 固定教育文案可以保留少量
- 不要让用户误以为所有结论都是个性化推导

可以接受：

- 1 条动态结论
- 1 到 2 条通用风险提示

---

## 执行方式

请按以下顺序工作：

1. 先阅读相关文件，不要立即重写
2. 逐项完成 `P1`
3. 完成后本地验证前后端是否还能跑
4. 再处理 `P2`
5. 最后处理 `P3`
6. 输出修复结果总结

---

## 本地验证要求

至少完成以下验证：

### 后端

- 可以启动
- `GET /api/health` 返回正常
- `POST /api/v1/compound/compare` 对合法输入返回正常结果
- 对非法输入返回可读错误

### 前端

- 可以启动
- 首页和对比页正常打开
- 默认方案名称显示正常
- 点击“开始对比”能看到结果
- 报错文案可读
- 图表正常显示

---

## 输出要求

完成后输出内容应包括：

1. 修复了哪些文件
2. 每项修复对应解决了哪个问题
3. 是否完成了本地验证
4. 是否还有未解决风险

如果某个问题无法修复，必须明确说明原因，不要跳过不报。

---

## 成功标准

本次任务完成的判断标准不是“代码更漂亮了”，而是：

- 用户打开页面不再看到乱码
- 复利计算与规格一致
- 表单和接口报错能读懂
- 页面不再出现误导性排名
- 项目仍然是一个可运行的最小 MVP

---

## 一句话约束

**这次是修复任务，不是重做任务；是收敛问题，不是扩展功能。**
