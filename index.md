---
layout: home

hero:
  name: 'LangChain.js'
  text: 'Tutorial'
  tagline: 从零开始掌握 LangChain.js Agent 开发，构建生产级 AI 应用
  image:
    src: /hero-image.svg
    alt: LangChain.js
  actions:
    - theme: brand
      text: 开始学习
      link: /#快速开始
    - theme: alt
      text: 查看示例
      link: /#模块目录

features:
  - icon: 🛠️
    title: Tool 工具模块
    details: 让 LLM 具备行动能力，实现文件操作、命令执行等外部功能
    link: /apps/tool-test/index
  - icon: 🔍
    title: RAG 检索增强生成
    details: 结合向量数据库，让模型基于私有知识库回答问题
    link: /apps/rag-test/index
  - icon: 💾
    title: Memory 对话记忆
    details: 管理多轮对话历史，实现记忆截断、总结、检索等策略
    link: /apps/memory-test/index
  - icon: 🗄️
    title: Milvus 向量数据库
    details: 高性能向量存储与检索，支持 CRUD 操作和 RAG 集成
    link: /apps/milvus-test/index
  - icon: 📊
    title: Output Parser 输出解析器
    details: 将 LLM 非结构化输出转换为 JSON、XML 等结构化数据
    link: /apps/output-parser-test/index
  - icon: 📝
    title: Prompt Template 提示词模板
    details: 参数化 Prompt 设计，支持 Few-Shot、Pipeline 等高级模式
    link: /apps/prompt-template-test/index
  - icon: 🔗
    title: Runnable 序列与链
    details: LangChain 的核心抽象，统一接口组合 Prompt、Model、Parser
    link: /apps/runnable-test/index
  - icon: 🏗️
    title: NestJS 集成
    details: 在 NestJS 框架中集成 LangChain，构建生产级 AI 服务
    link: /apps/hello-nest-langchain/index
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
  --vp-home-hero-image-filter: blur(44px);
}

.VPHero .image-bg {
  transition: transform 0.5s;
}

.VPHero:hover .image-bg {
  transform: scale(1.1);
}
</style>

<Home />

## 项目简介

这是一个用于学习和记录 LangChain.js Agent 开发的 monorepo 项目。通过多个独立的子包，深入讲解 LangChain.js 的核心功能模块，每个模块都包含完整的代码示例和详细的使用文档。

### 技术栈

- **LangChain.js**: v1.1+ (最新版本)
- **运行时**: Node.js 18+ / TypeScript
- **包管理**: pnpm
- **LLM**: 支持 OpenAI、Qwen、Claude 等
- **向量数据库**: Milvus
- **框架**: NestJS (可选)

### 项目特点

- ✅ **模块化设计**: 每个子包聚焦一个核心功能
- ✅ **完整示例**: 所有代码可直接运行
- ✅ **渐进式学习**: 从基础到进阶，循序渐进
- ✅ **生产就绪**: 包含错误处理、性能优化、最佳实践

## 模块目录

| 模块                     | 功能简介                                                                            | 难度     | 文档                                         |
| ------------------------ | ----------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| **tool-test**            | Tool 工具模块 - 让 LLM 具备行动能力，实现文件操作、命令执行等外部功能               | ⭐⭐     | [查看文档](/apps/tool-test/index)            |
| **rag-test**             | RAG 检索增强生成 - 结合向量数据库，让模型基于私有知识库回答问题                     | ⭐⭐⭐   | [查看文档](/apps/rag-test/index)             |
| **memory-test**          | Memory 对话记忆 - 管理多轮对话历史，实现记忆截断、总结、检索等策略                  | ⭐⭐     | [查看文档](/apps/memory-test/index)          |
| **milvus-test**          | Milvus 向量数据库 - 高性能向量存储与检索，支持 CRUD 操作和 RAG 集成                 | ⭐⭐⭐   | [查看文档](/apps/milvus-test/index)          |
| **output-parser-test**   | Output Parser 输出解析器 - 将 LLM 非结构化输出转换为 JSON、XML 等结构化数据         | ⭐⭐     | [查看文档](/apps/output-parser-test/index)   |
| **prompt-template-test** | Prompt Template 提示词模板 - 参数化 Prompt 设计，支持 Few-Shot、Pipeline 等高级模式 | ⭐⭐     | [查看文档](/apps/prompt-template-test/index) |
| **runnable-test**        | Runnable 序列与链 - LangChain 的核心抽象，统一接口组合 Prompt、Model、Parser        | ⭐⭐⭐⭐ | [查看文档](/apps/runnable-test/index)        |
| **hello-nest-langchain** | NestJS + LangChain 集成 - 在 NestJS 框架中集成 LangChain，构建生产级 AI 服务        | ⭐⭐⭐⭐ | [查看文档](/apps/hello-nest-langchain/index) |

### 学习路径推荐

#### 初学者路径

1. **[Tool 模块](/apps/tool-test/index)** → 了解如何让 LLM 调用外部工具
2. **[Prompt Template](/apps/prompt-template-test/index)** → 掌握 Prompt 设计最佳实践
3. **[Output Parser](/apps/output-parser-test/index)** → 学习如何结构化 LLM 输出
4. **[Memory 模块](/apps/memory-test/index)** → 实现多轮对话能力

#### 进阶路径

5. **[RAG 模块](/apps/rag-test/index)** → 构建基于知识库的问答系统
6. **[Milvus 集成](/apps/milvus-test/index)** → 深入向量数据库的使用
7. **[Runnable 模块](/apps/runnable-test/index)** → 掌握 LangChain 的核心抽象

#### 实战路径

8. **[NestJS 集成](/apps/hello-nest-langchain/index)** → 构建生产级 AI 服务

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 10.15.0
- OpenAI API Key 或其他兼容的 LLM API

### 克隆项目

```bash
git clone https://github.com/jokerwon/agent-tutorial.git
cd agent-tutorial
```

### 安装依赖

```bash
# 安装所有子包的依赖
pnpm install

# 或单独安装某个子包
cd apps/tool-test
pnpm install
```

### 配置环境变量

在每个子包的 `.env` 文件中配置:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-plus
EMBEDDINGS_MODEL_NAME=text-embedding-v3
```

::: tip API Key 安全
请勿将 `.env` 文件提交到 Git。推荐使用环境变量或密钥管理服务。
:::

### 运行示例

```bash
# 进入某个子包
cd apps/tool-test

# 运行示例
node src/hello-langchain.mjs

# 或运行其他示例
node src/mini-cursor.mjs
```

### 常用命令

```bash
# 安装依赖
pnpm install

# 运行示例
node src/example.mjs

# 使用 ts-node 运行 TypeScript
npx ts-node src/example.ts

# 启动 NestJS 服务
pnpm run start:dev
```

## 核心概念

### LangChain.js 是什么?

LangChain.js 是一个用于构建 AI 应用程序的开源框架，它提供了:

- **统一的接口**: 将不同 LLM 提供商抽象为统一接口
- **组合能力**: 通过 Runnable 链式组合 Prompt、Model、Parser
- **记忆管理**: 内置多种对话记忆策略
- **工具集成**: 让 LLM 能够调用外部 API 和工具
- **RAG 支持**: 简化检索增强生成流程

### 核心模块概览

```
┌─────────────────────────────────────────────────────────┐
│                    LangChain.js                         │
├─────────────────────────────────────────────────────────┤
│  Prompt Template  │  定义提示词模板，参数化输入         │
├─────────────────────────────────────────────────────────┤
│  Model (LLM)      │  调用 OpenAI、Claude 等 LLM         │
├─────────────────────────────────────────────────────────┤
│  Output Parser    │  将文本输出转为结构化数据           │
├─────────────────────────────────────────────────────────┤
│  Runnable         │  核心抽象，支持链式调用和流式输出   │
├─────────────────────────────────────────────────────────┤
│  Memory           │  管理对话历史，支持多种策略         │
├─────────────────────────────────────────────────────────┤
│  Tool             │  封装外部功能，让 LLM 能够调用      │
├─────────────────────────────────────────────────────────┤
│  RAG              │  检索增强生成，结合知识库回答       │
├─────────────────────────────────────────────────────────┤
│  Vector Store     │  向量数据库存储与检索               │
└─────────────────────────────────────────────────────────┘
```

### 典型工作流程

```
用户输入
   ↓
Prompt Template (格式化)
   ↓
Model (LLM 推理)
   ↓
Output Parser (解析输出)
   ↓
结构化数据
```

## 最佳实践

### 1. Prompt 设计

- ✅ 使用 Prompt Template 管理提示词，避免字符串拼接
- ✅ 为 Few-Shot 示例选择高质量、多样化的样本
- ✅ 在 Prompt 末尾明确输出格式要求
- ❌ 避免 Prompt 过长导致 token 浪费

### 2. 错误处理

```typescript
import { RunnableWithRetry, RunnableWithFallbacks } from '@langchain/core/runnables'

// 重试机制
const chainWithRetry = chain.withRetry({ stopAfterAttempt: 3 })

// 降级策略
const chainWithFallback = primaryModel.withFallbacks({
  fallbacks: [secondaryModel, localModel],
})
```

### 3. 性能优化

- 使用流式输出提升用户体验
- 批量调用 `batch()` 提高吞吐量
- 缓存 Embedding 向量避免重复计算
- 使用向量数据库索引加速检索

### 4. 安全考虑

- 不要在 Prompt 中暴露敏感信息
- 限制 Tool 的权限范围(如文件访问路径)
- 对用户输入进行验证和清洗
- 使用环境变量存储 API Key

### 5. 成本控制

- 设置合理的 `maxTokens` 限制输出长度
- 使用 `temperature: 0` 减少随机性，提高缓存命中率
- 选择合适能力的模型(如简单任务用 qwen-turbo)
- 监控 API 调用次数和 token 消耗

## 常见问题

### 1. API 调用失败

**问题**: `Error: API key not found`

**解决方案**:

- 检查 `.env` 文件是否正确配置
- 确保 `OPENAI_API_KEY` 环境变量已设置
- 验证 API Key 是否有效且未过期

### 2. 模型响应慢

**问题**: LLM 响应时间过长

**解决方案**:

- 使用流式输出 `stream()` 提升感知速度
- 选择响应更快的模型(如 qwen-turbo)
- 减少 Prompt 长度和输出 token 数
- 考虑使用本地部署的模型

### 3. 输出格式不稳定

**问题**: Output Parser 解析失败

**解决方案**:

- 使用 `withStructuredOutput()` 替代手动解析
- 在 Prompt 中强调输出格式要求
- 降低 `temperature` 为 0 提高稳定性
- 使用更强大的模型(如 qwen-plus)

### 4. 内存占用过高

**问题**: Memory 模块导致内存溢出

**解决方案**:

- 使用持久化存储替代内存存储
- 实现记忆截断或总结策略
- 限制保存的对话轮数
- 定期清理过期对话历史

### 5. 向量检索不准确

**问题**: RAG 检索到的内容不相关

**解决方案**:

- 优化文档分块策略(chunkSize、chunkOverlap)
- 调整 `k` 值返回更多候选文档
- 使用更高质量的 Embedding 模型
- 过滤低相似度的结果

## 进阶资源

### 官方文档

- [LangChain.js 官方文档](https://js.langchain.com/)
- [LangChain.js GitHub](https://github.com/langchain-ai/langchainjs)
- [LangChain.js 示例库](https://github.com/langchain-ai/langchainjs/tree/main/examples)

### 相关工具

- [LangSmith](https://www.langchain.com/langsmith): LLM 应用调试与监控平台
- [Milvus](https://milvus.io/): 开源向量数据库
- [Ollama](https://ollama.ai/): 本地运行开源 LLM

### 学习资源

- [LangChain.js 官方教程](https://js.langchain.com/docs/tutorials/)
- [LangChain.js Cookbook](https://github.com/langchain-ai/langchainjs/tree/main/cookbook)
- [LangChain Blog](https://blog.langchain.dev/)

## 贡献指南

欢迎提交 Issue 和 Pull Request!

### 开发指南

1. Fork 本仓库
2. 创建新分支: `git checkout -b feature/new-module`
3. 提交代码: `git commit -m 'Add new module'`
4. 推送分支: `git push origin feature/new-module`
5. 提交 Pull Request

### 代码规范

- 使用 TypeScript 编写代码
- 遵循 ESLint 和 Prettier 规范
- 为复杂逻辑添加注释
- 编写清晰的示例和文档

## 许可证

ISC License

---

::: tip 开始学习
推荐从 [Tool 模块](/apps/tool-test/index) 开始，逐步掌握 LangChain.js 的核心功能。
:::
