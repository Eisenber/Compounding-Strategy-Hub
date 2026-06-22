# RAG 知识库问答功能交接上下文

## 1. 目标与当前状态

本轮已在项目 `E:\复利选股` 中新增并打通一个本地 RAG 知识库问答功能，包含：

- 后端知识库索引与问答接口
- 前端独立页面 `http://localhost:3000/knowledge`
- 本地私有模型配置加载
- 前后端联调验证

当前状态结论：

- 前端页面已完成，且已中文化
- 后端接口已完成，且可正常返回检索结果
- 本地私有模型配置已成功加载
- 在当前受限执行环境中，外网模型请求被拦截，因此会回退为检索模式
- 在用户自己的本机终端运行时，理论上应能正常访问 DeepSeek

---

## 2. 本轮完成的核心任务

### 2.1 后端新增能力

新增了知识库相关接口：

- `POST /api/v1/knowledge/ask`
- `POST /api/v1/knowledge/reindex`

后端实现能力包括：

- 扫描本地文档并切片
- 构建轻量本地检索索引
- 支持仅检索回答
- 支持接入 OpenAI 兼容接口的大模型生成
- 当生成失败时自动回退到检索结果
- 对 DeepSeek/OpenAI 兼容返回做了额外兼容处理

### 2.2 前端新增页面

新增了独立知识库页面：

- 路由：`/knowledge`
- 页面功能：
  - 提问
  - 重建索引
  - 查看命中文档片段
  - 查看当前回答模式

### 2.3 中文化

`/knowledge` 页面已切换为中文，包含：

- 标题
- 说明文案
- 提问区
- 按钮
- 状态提示
- 推荐问题
- 命中文档区
- 接口说明

### 2.4 模式提示优化

前端页面已明确区分以下状态：

- 当前模式：生成式回答
- 当前模式：检索回退
- 当前模式：仅检索

这样用户可以明确知道：

- 是否真的走了生成模型
- 是否虽然配置了模型，但本次回退到了检索输出

---

## 3. 关键文件

### 3.1 后端核心文件

- [backend/src/main/java/com/example/compound/controller/KnowledgeBaseController.java](/E:/复利选股/backend/src/main/java/com/example/compound/controller/KnowledgeBaseController.java)
- [backend/src/main/java/com/example/compound/service/knowledge/KnowledgeBaseService.java](/E:/复利选股/backend/src/main/java/com/example/compound/service/knowledge/KnowledgeBaseService.java)
- [backend/src/main/java/com/example/compound/service/knowledge/OpenAiCompatibleKnowledgeAnswerGenerator.java](/E:/复利选股/backend/src/main/java/com/example/compound/service/knowledge/OpenAiCompatibleKnowledgeAnswerGenerator.java)
- [backend/src/main/java/com/example/compound/service/knowledge/KnowledgeChunk.java](/E:/复利选股/backend/src/main/java/com/example/compound/service/knowledge/KnowledgeChunk.java)
- [backend/src/main/java/com/example/compound/service/knowledge/KnowledgeAnswerGenerator.java](/E:/复利选股/backend/src/main/java/com/example/compound/service/knowledge/KnowledgeAnswerGenerator.java)
- [backend/src/main/java/com/example/compound/service/knowledge/KnowledgeChunkSearchResult.java](/E:/复利选股/backend/src/main/java/com/example/compound/service/knowledge/KnowledgeChunkSearchResult.java)
- [backend/src/main/java/com/example/compound/config/KnowledgeBaseProperties.java](/E:/复利选股/backend/src/main/java/com/example/compound/config/KnowledgeBaseProperties.java)
- [backend/src/main/resources/application.properties](/E:/复利选股/backend/src/main/resources/application.properties)
- [backend/pom.xml](/E:/复利选股/backend/pom.xml)

### 3.2 后端测试文件

- [backend/src/test/java/com/example/compound/service/knowledge/KnowledgeBaseServiceTest.java](/E:/复利选股/backend/src/test/java/com/example/compound/service/knowledge/KnowledgeBaseServiceTest.java)

### 3.3 前端核心文件

- [frontend/src/pages/KnowledgePage.jsx](/E:/复利选股/frontend/src/pages/KnowledgePage.jsx)
- [frontend/src/services/api.js](/E:/复利选股/frontend/src/services/api.js)
- [frontend/src/App.jsx](/E:/复利选股/frontend/src/App.jsx)
- [frontend/src/pages/HomePage.jsx](/E:/复利选股/frontend/src/pages/HomePage.jsx)

### 3.4 本地私有配置相关

- [backend/config/application-secrets.properties](/E:/复利选股/backend/config/application-secrets.properties)
- [.gitignore](/E:/复利选股/.gitignore)

注意：

- `backend/config/application-secrets.properties` 中存放真实模型配置
- 该文件已被 `.gitignore` 忽略
- 不要把该文件内容粘贴进新的上下文窗口

---

## 4. 模型配置现状

当前模型配置已写入本地私有配置文件，且成功加载。

已确认：

- `generationAvailable` 可以变成 `true`
- 说明后端已读到 API key、model、base URL

已做的兼容点：

- 支持 `message.content` 文本
- 支持 `message.content` 数组
- 支持 `message.reasoning_content`
- 非 2xx 或 2xx 但无可用内容时，会记录日志

---

## 5. 联调结果

### 5.1 已验证成功

- 后端健康检查正常：`/api/health`
- 前端 dev 服务正常：`http://127.0.0.1:3000`
- 知识库重建索引正常
- 知识库问答接口正常
- 前端能拿到后端 JSON 并显示模式提示

### 5.2 已验证的返回特征

在当前受限环境下，接口返回过：

- `generationAvailable: true`
- `mode: retrieval`

这说明：

- 生成能力配置存在
- 但本次请求没有实际拿到模型可用回答

---

## 6. 已定位的关键问题

### 6.1 当前 Codex 受限环境无法访问外网模型

最重要的日志结论：

- `Permission denied: getsockopt`

这表示：

- 本地前后端链路没有问题
- 当前受限执行环境阻止了 Java 进程访问 DeepSeek 外网接口

因此在本环境下：

- 只能拿到检索回退结果
- 无法真实验证 DeepSeek 生成式回答

### 6.2 用户本机网络大概率是通的

用户在本机 PowerShell 中执行：

- `Invoke-WebRequest -Uri 'https://api.deepseek.com' -UseBasicParsing`

拿到的是认证失败响应，而不是连接失败。

这说明：

- 用户本机到 DeepSeek 的网络是通的
- 根地址未带鉴权，返回认证失败属于正常现象

因此更合理的判断是：

- 用户自己的本机终端运行该项目时，更有可能成功访问 DeepSeek

---

## 7. 配置加载问题与修复历史

本轮已经修过一次配置路径问题：

最初 `spring.config.import` 只写了：

- `optional:file:./backend/config/application-secrets.properties`

这只适合从项目根目录启动。

后来改成双路径兼容：

- `optional:file:./config/application-secrets.properties`
- `optional:file:./backend/config/application-secrets.properties`

这样兼容：

- 从仓库根目录启动
- 从 `backend` 目录启动

当前配置位置：

- [backend/src/main/resources/application.properties](/E:/复利选股/backend/src/main/resources/application.properties)

---

## 8. 运行与验证命令

### 8.1 后端

```powershell
cd E:\复利选股\backend
mvn -o package -DskipTests
java -jar target\compound-compare-0.1.0.jar
```

### 8.2 前端

```powershell
cd E:\复利选股\frontend
npm run dev
```

### 8.3 本地知识库问答接口测试

```powershell
$body = @{
  question = 'Summarize the stock-picking strategies supported by this project.'
  topK = 5
  useGeneration = $true
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'http://localhost:8080/api/v1/knowledge/ask' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -UseBasicParsing
```

### 8.4 页面访问

```text
http://localhost:3000/knowledge
```

---

## 9. 当前页面行为说明

在 `/knowledge` 页面中：

- 如果显示“当前模式：生成式回答”
  - 说明 DeepSeek 生成式调用成功

- 如果显示“当前模式：检索回退”
  - 说明模型配置已启用
  - 但本次请求没有拿到可用生成结果

- 如果显示“当前模式：仅检索”
  - 说明要么用户手动关闭了生成
  - 要么后端当前没有加载到模型配置

---

## 10. 建议下一个 agent 优先做的事

如果下一个 agent 运行在用户本机真实终端环境，而不是当前受限环境，建议按下面顺序继续：

1. 从用户本机直接启动后端和前端
2. 访问 `/knowledge`
3. 勾选“使用生成式回答”
4. 发起一次简单问题
5. 观察页面模式提示是否变成“当前模式：生成式回答”
6. 如果仍回退：
   - 读取后端日志中 `OpenAiCompatibleKnowledgeAnswerGenerator` 的输出
   - 查看是否是模型返回错误、额度问题、格式问题、或内容为空

---

## 11. 若继续排查 DeepSeek 生成失败，优先关注点

- DeepSeek 是否真正返回了 2xx
- 返回体里 `choices[0].message.content` 是否为空
- 是否只返回了 `reasoning_content`
- 是否是模型端报错
- 是否是账号额度、频率限制、模型权限问题

当前代码已经为这些场景做了基础兼容与日志输出，下一位 agent 不需要从零重写。

---

## 12. 额外说明

当前工作区里还有一些与本轮任务无关的状态，例如：

- `backend/target`
- `frontend/dist`
- `.m2`
- `backend/data/*.wal` / `*.shm`

这些多半是构建或运行产物，不建议下一个 agent 在没有明确授权前做破坏性清理。

