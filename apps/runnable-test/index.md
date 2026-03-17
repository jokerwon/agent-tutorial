---
title: Runnable 序列与链式调用指南
description: 介绍 LangChain.js Runnable 模块的核心用法与示例
---

# Runnable 序列与链式调用

## 简介

Runnable 是 LangChain 的核心抽象,它将所有组件(Prompt、Model、OutputParser 等)统一为可组合的"可运行单元"。通过 `pipe()` 或 `RunnableSequence`,你可以像搭积木一样将多个 Runnable 串联成处理链,实现从输入到输出的自动化流程。Runnable 支持同步、异步、流式和批量调用,是构建复杂 AI 应用流的基础。

## 环境配置

在 `.env` 文件中配置以下环境变量:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-plus
EMBEDDINGS_MODEL_NAME=text-embedding-v3
```

::: tip 核心优势
Runnable 提供统一的接口,让 Prompt、Model、Parser 等组件可以无缝组合,代码更简洁、可维护性更强。
:::

## 核心概念

### Runnable 接口

所有 Runnable 都实现了以下核心方法:

```typescript
interface Runnable {
  // 同步/异步调用
  invoke(input: Input): Promise<Output>

  // 流式调用
  stream(input: Input): AsyncGenerator<Output>

  // 批量调用
  batch(inputs: Input[]): Promise<Output[]>

  // 链式组合
  pipe(next: Runnable): RunnableSequence
}
```

### RunnableSequence

将多个 Runnable 按顺序串联,前一个的输出作为后一个的输入:

```typescript
// 方式 1: 使用 pipe()
const chain = promptTemplate.pipe(model).pipe(outputParser)

// 方式 2: 使用 RunnableSequence.from()
const chain = RunnableSequence.from([promptTemplate, model, outputParser])

// 调用链
const result = await chain.invoke({ text: '...' })
```

### Runnable 类型

| Runnable 类型           | 用途       | 示例场景                 |
| ----------------------- | ---------- | ------------------------ |
| `RunnableSequence`      | 顺序执行   | Prompt → Model → Parser  |
| `RunnableLambda`        | 自定义函数 | 数据转换、业务逻辑       |
| `RunnableMap`           | 并行执行   | 同时生成多个输出         |
| `RunnableBranch`        | 条件分支   | 根据输入选择不同处理逻辑 |
| `RunnablePassthrough`   | 数据透传   | 保留原始输入             |
| `RunnableWithRetry`     | 重试机制   | 处理不稳定的外部服务     |
| `RunnableWithFallbacks` | 降级策略   | 高可用服务切换           |
| `RouterRunnable`        | 路由分发   | 动态选择 Runnable        |

## 使用示例

### 示例 1:传统方式 vs Runnable

对比传统步骤式调用和 Runnable 链式调用:

#### 传统方式(步骤式)

```typescript
import 'dotenv/config'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { z } from 'zod'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const schema = z.object({
  translation: z.string().describe('翻译后的英文文本'),
  keywords: z.array(z.string()).length(3).describe('3个关键词'),
})

const outputParser = StructuredOutputParser.fromZodSchema(schema)
const promptTemplate = PromptTemplate.fromTemplate('将以下文本翻译成英文,然后总结为3个关键词。\n\n文本:{text}\n\n{format_instructions}')

const input = {
  text: 'LangChain 是一个强大的 AI 应用开发框架',
  format_instructions: outputParser.getFormatInstructions(),
}

// 步骤 1: 格式化 prompt
const formattedPrompt = await promptTemplate.format(input)

// 步骤 2: 调用模型
const response = await model.invoke(formattedPrompt)

// 步骤 3: 解析输出
const result = await outputParser.invoke(response)

console.log('✅ 最终结果:')
console.log(result)
```

运行:

```bash
node src/before.mjs
```

#### Runnable 链式调用(推荐)

```typescript
import 'dotenv/config'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { PromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { RunnableSequence } from '@langchain/core/runnables'
import { z } from 'zod'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const schema = z.object({
  translation: z.string().describe('翻译后的英文文本'),
  keywords: z.array(z.string()).length(3).describe('3个关键词'),
})

const outputParser = StructuredOutputParser.fromZodSchema(schema)
const promptTemplate = PromptTemplate.fromTemplate('将以下文本翻译成英文,然后总结为3个关键词。\n\n文本:{text}\n\n{format_instructions}')

// 创建链
const chain = RunnableSequence.from([promptTemplate, model, outputParser])

const input = {
  text: 'LangChain 是一个强大的 AI 应用开发框架',
  format_instructions: outputParser.getFormatInstructions(),
}

// 一步调用
const result = await chain.invoke(input)

console.log('✅ 最终结果:')
console.log(result)
```

运行:

```bash
node src/runnable.mjs
```

### 示例 2:RunnableLambda 自定义函数

将普通函数转换为 Runnable:

```typescript
import 'dotenv/config'
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables'

// 创建自定义 Runnable
const addOne = RunnableLambda.from((input) => {
  console.log(`输入: ${input}`)
  return input + 1
})

const multiplyTwo = RunnableLambda.from((input) => {
  console.log(`输入: ${input}`)
  return input * 2
})

// 组合成链
const chain = RunnableSequence.from([addOne, multiplyTwo])

const result = await chain.invoke(1)
console.log(`最终结果: ${result}`)

// 输出:
// 输入: 1
// 输入: 2
// 最终结果: 4
```

运行:

```bash
node src/runnables/RunnableLambda.mjs
```

### 示例 3:RunnableMap 并行执行

同时执行多个 Runnable 并返回对象:

```typescript
import 'dotenv/config'
import { RunnableMap, RunnableLambda } from '@langchain/core/runnables'
import { PromptTemplate } from '@langchain/core/prompts'

const addOne = RunnableLambda.from((input) => input.num + 1)
const multiplyTwo = RunnableLambda.from((input) => input.num * 2)
const square = RunnableLambda.from((input) => input.num * input.num)

const greetTemplate = PromptTemplate.fromTemplate('你好,{name}!')
const weatherTemplate = PromptTemplate.fromTemplate('今天天气{weather}。')

// 创建 RunnableMap,并行执行多个 runnable
const runnableMap = RunnableMap.from({
  // 数学运算
  add: addOne,
  multiply: multiplyTwo,
  square: square,
  // prompt 格式化
  greeting: greetTemplate,
  weather: weatherTemplate,
})

// 测试输入
const input = {
  name: '神光',
  weather: '多云',
  num: 5,
}

// 执行 RunnableMap
const result = await runnableMap.invoke(input)
console.log(result)

// 输出:
// {
//   add: 6,
//   multiply: 10,
//   square: 25,
//   greeting: '你好,神光!',
//   weather: '今天天气多云。'
// }
```

运行:

```bash
node src/runnables/RunnableMap.mjs
```

### 示例 4:RunnableBranch 条件分支

根据条件选择不同的处理逻辑:

```typescript
import 'dotenv/config'
import { RunnableBranch, RunnableLambda } from '@langchain/core/runnables'

// 创建条件判断函数
const isPositive = RunnableLambda.from((input) => input > 0)
const isNegative = RunnableLambda.from((input) => input < 0)
const isEven = RunnableLambda.from((input) => input % 2 === 0)

// 创建分支处理函数
const handlePositive = RunnableLambda.from((input) => `正数: ${input} + 10 = ${input + 10}`)
const handleNegative = RunnableLambda.from((input) => `负数: ${input} - 10 = ${input - 10}`)
const handleEven = RunnableLambda.from((input) => `偶数: ${input} * 2 = ${input * 2}`)
const handleDefault = RunnableLambda.from((input) => `默认: ${input}`)

// 创建 RunnableBranch
const branch = RunnableBranch.from([
  [isPositive, handlePositive],
  [isNegative, handleNegative],
  [isEven, handleEven],
  handleDefault, // 默认分支
])

// 测试不同的输入
const testCases = [5, -3, 4, 0]

for (const testCase of testCases) {
  const result = await branch.invoke(testCase)
  console.log(`输入: ${testCase} => ${result}`)
}

// 输出:
// 输入: 5 => 正数: 5 + 10 = 15
// 输入: -3 => 负数: -3 - 10 = -13
// 输入: 4 => 正数: 4 + 10 = 14
// 输入: 0 => 偶数: 0 * 2 = 0
```

运行:

```bash
node src/runnables/RunnableBranch.mjs
```

### 示例 5:RunnablePassthrough 数据透传

保留原始输入并添加新字段:

```typescript
import 'dotenv/config'
import { RunnablePassthrough, RunnableLambda, RunnableSequence } from '@langchain/core/runnables'

const chain = RunnableSequence.from([
  // 步骤 1: 将字符串转为对象
  (input) => ({ concept: input }),

  // 步骤 2: 透传原始数据并添加新字段
  RunnablePassthrough.assign({
    original: new RunnablePassthrough(), // 保留原始对象
    processed: (obj) => ({
      concept: obj.concept,
      upper: obj.concept.toUpperCase(),
      length: obj.concept.length,
    }),
  }),
])

const input = '神说要有光'
const result = await chain.invoke(input)
console.log(result)

// 输出:
// {
//   concept: '神说要有光',
//   original: { concept: '神说要有光' },
//   processed: {
//     concept: '神说要有光',
//     upper: '神说要有光',
//     length: 5
//   }
// }
```

运行:

```bash
node src/runnables/RunnablePassthrough.mjs
```

### 示例 6:RunnableWithRetry 重试机制

为不稳定的操作添加重试逻辑:

```typescript
import 'dotenv/config'
import { RunnableLambda } from '@langchain/core/runnables'

let attempt = 0

// 一个会随机失败的 Runnable
const unstableRunnable = RunnableLambda.from(async (input) => {
  attempt += 1
  console.log(`第 ${attempt} 次尝试,输入: ${input}`)

  // 模拟 70% 概率失败的情况
  if (Math.random() < 0.7) {
    console.log('本次尝试失败,抛出错误。')
    throw new Error('模拟的随机错误')
  }

  console.log('本次尝试成功。')
  return `成功处理: ${input}`
})

// 使用 withRetry 为 runnable 加上重试逻辑
const runnableWithRetry = unstableRunnable.withRetry({
  stopAfterAttempt: 5, // 总共最多 5 次尝试
})

try {
  const result = await runnableWithRetry.invoke('演示 withRetry')
  console.log('✅ 最终结果:', result)
} catch (err) {
  console.error('❌ 重试多次后仍然失败:', err?.message ?? err)
}
```

运行:

```bash
node src/runnables/RunnableWithRetry.mjs
```

### 示例 7:RunnableWithFallbacks 降级策略

依次尝试多个备用方案:

```typescript
import 'dotenv/config'
import { RunnableLambda } from '@langchain/core/runnables'

// 模拟三个"翻译服务",优先级从高到低
const premiumTranslator = RunnableLambda.from(async (text) => {
  console.log('[Premium] 尝试翻译...')
  throw new Error('Premium 服务超时') // 模拟服务不可用
})

const standardTranslator = RunnableLambda.from(async (text) => {
  console.log('[Standard] 尝试翻译...')
  return 'xxx' // 返回无效结果
})

const localTranslator = RunnableLambda.from(async (text) => {
  console.log('[Local] 使用本地词典翻译...')
  const dict = { hello: '你好', world: '世界', goodbye: '再见' }
  const words = text.toLowerCase().split(' ')
  return words.map((w) => dict[w] ?? w).join('')
})

// withFallbacks:依次尝试 premium → standard → local
const translator = premiumTranslator.withFallbacks({
  fallbacks: [standardTranslator, localTranslator],
})

const result = await translator.invoke('hello world')
console.log('翻译结果:', result)

// 输出:
// [Premium] 尝试翻译...
// [Standard] 尝试翻译...
// 翻译结果: xxx
```

运行:

```bash
node src/runnables/RunnableWithFallbacks.mjs
```

### 示例 8:RouterRunnable 路由分发

根据 key 动态选择 Runnable:

```typescript
import 'dotenv/config'
import { RouterRunnable, RunnableLambda } from '@langchain/core/runnables'

// 创建两个简单的 RunnableLambda
const toUpperCase = RunnableLambda.from((text) => text.toUpperCase())
const reverseText = RunnableLambda.from((text) => text.split('').reverse().join(''))

// 创建 RouterRunnable,根据 key 选择要调用的 runnable
const router = new RouterRunnable({
  runnables: {
    toUpperCase,
    reverseText,
  },
})

// 测试:调用 reverseText
const result1 = await router.invoke({ key: 'reverseText', input: 'Hello World' })
console.log('reverseText 结果:', result1)

// 测试:调用 toUpperCase
const result2 = await router.invoke({ key: 'toUpperCase', input: 'Hello World' })
console.log('toUpperCase 结果:', result2)

// 输出:
// reverseText 结果: dlroW olleH
// toUpperCase 结果: HELLO WORLD
```

运行:

```bash
node src/runnables/RouterRunnable.mjs
```

### 示例 9:复杂 RAG 链(进阶)

使用 Runnable 构建 RAG 检索增强生成链:

```typescript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables'
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'

const model = new ChatOpenAI({
  temperature: 0.7,
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: 1024,
})

const milvusClient = new MilvusClient({
  address: 'localhost:19530',
})

// Runnable 1: 从 Milvus 检索相关内容
const milvusSearch = new RunnableLambda({
  func: async (input) => {
    const { question, k = 5 } = input
    const queryVector = await embeddings.embedQuery(question)

    const searchResult = await milvusClient.search({
      collection_name: 'ebook_collection',
      vector: queryVector,
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['id', 'book_id', 'chapter_num', 'content'],
    })

    const results = searchResult.results ?? []
    const retrievedContent = results.map((item) => ({
      content: item.content,
      score: item.score,
    }))

    return { question, retrievedContent }
  },
})

// Runnable 2: 构建 Prompt 输入
const buildPromptInput = new RunnableLambda({
  func: async (input) => {
    const { question, retrievedContent } = input

    const context = retrievedContent.map((item, i) => `[片段 ${i + 1}]\n${item.content}`).join('\n\n━━━━━\n\n')

    return { question, context }
  },
})

// PromptTemplate
const promptTemplate = PromptTemplate.fromTemplate(
  `你是一个专业的小说助手。基于小说内容回答问题。

小说片段:
{context}

用户问题: {question}

请结合小说内容给出详细、准确的回答:`,
)

// 完整的 RAG 链
const ragChain = RunnableSequence.from([milvusSearch, buildPromptInput, promptTemplate, model, new StringOutputParser()])

// 调用链
const answer = await ragChain.invoke({
  question: '鸠摩智会什么武功?',
  k: 5,
})

console.log(answer)
```

运行(需要先导入电子书数据):

```bash
node src/cases/ebook-reader-rag.mjs
```

## 常见问题

### 1. 类型不匹配

**问题**: Runnable 链中前一个输出类型与后一个输入类型不匹配

**解决方案**:

- 使用 `RunnableLambda` 进行类型转换
- 检查每个 Runnable 的输入输出类型
- 使用 TypeScript 类型检查避免运行时错误

### 2. 链过长难以调试

**问题**: RunnableSequence 包含太多步骤,出错时难以定位

**解决方案**:

- 使用 `RunnableLambda` 在关键步骤打印日志
- 拆分为多个子链,分别测试
- 使用 LangSmith 或回调函数追踪每步执行

### 3. 并行执行顺序不确定

**问题**: RunnableMap 中的执行顺序不确定

**说明**: RunnableMap 会并行执行所有 Runnable,顺序不保证,适合相互独立的操作

### 4. 重试导致重复副作用

**问题**: RunnableWithRetry 重试时会重复执行副作用(如发送邮件)

**解决方案**:

- 将副作用操作移到重试逻辑之外
- 使用幂等性设计,避免重复执行的影响
- 限制重试次数,避免过度重试

### 5. Fallbacks 无法捕获无效结果

**问题**: withFallbacks 只捕获异常,不捕获无效返回值

**解决方案**:

- 在 Runnable 中抛出异常而非返回无效值
- 使用自定义验证逻辑,不满足条件时抛出异常

## 注意事项

1. **错误处理**: Runnable 链中任何一步抛出异常都会中断整个链,使用 `withRetry` 或 `withFallbacks` 增强容错性

2. **性能优化**: RunnableMap 会并行执行,适合独立任务;RunnableSequence 串行执行,适合有依赖关系的任务

3. **流式支持**: 所有 Runnable 都支持 `stream()` 方法,适合实时输出场景

4. **批量调用**: 使用 `batch()` 一次性处理多个输入,提高效率

5. **调试技巧**: 在 RunnableLambda 中添加 `console.log` 打印中间结果,便于调试

6. **类型安全**: 使用 TypeScript 泛型约束 Runnable 的输入输出类型,避免类型错误

## 相关资源

- [LangChain.js 官方文档 - Runnables](https://js.langchain.com/docs/expression_language/)
- [Runnable 接口规范](https://js.langchain.com/docs/expression_language/interface)
- [组合模式最佳实践](https://js.langchain.com/docs/expression_language/cookbook)
