---
title: Memory 对话记忆模块指南
description: 介绍 LangChain.js Memory 模块的核心用法与示例
---

# Memory 对话记忆模块

## 简介

Memory 模块让 LLM 能够"记住"之前的对话内容,从而实现连贯的多轮对话。LangChain 提供了多种记忆策略:从简单的内存存储到持久化存储,再到智能的截断、总结和检索策略,帮助你平衡上下文长度与对话质量。

## 环境配置

在 `.env` 文件中配置以下环境变量:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-plus
EMBEDDINGS_MODEL_NAME=text-embedding-v3

# 文件操作权限路径
ALLOWED_PATHS=/path/to/allowed/dir
```

::: tip 模型选择
Memory 模块不需要特殊的模型配置,使用常规的 Chat 模型即可。但如果使用检索策略,需要配置 Embedding 模型。
:::

## 核心概念

### BaseChatMessageHistory

所有记忆存储的基类,定义了统一的接口:

```typescript
import { BaseChatMessageHistory } from '@langchain/core/chat_history'

// 核心方法
await history.addMessage(message) // 添加消息
await history.getMessages() // 获取所有消息
await history.clear() // 清空历史
```

### 消息类型

LangChain 使用不同的消息类型表示对话角色:

```typescript
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages'

const userMsg = new HumanMessage('用户说的话')
const aiMsg = new AIMessage('AI 的回复')
const sysMsg = new SystemMessage('系统提示词')
```

### 记忆策略

LangChain 提供了四种主要的记忆管理策略:

1. **完整存储**: 保存所有历史消息,适用于短对话
2. **截断策略(Truncation)**: 按消息数量或 token 数截断,保留最近的消息
3. **总结策略(Summarization)**: 将旧消息总结为摘要,压缩上下文长度
4. **检索策略(Retrieval)**: 使用向量检索,动态获取相关历史对话

## 使用示例

### 示例 1:内存存储(InMemory)

最基础的记忆方式,将对话保存在内存中:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

async function inMemoryDemo() {
  const history = new InMemoryChatMessageHistory()

  const systemMessage = new SystemMessage('你是一个友好、幽默的做菜助手,喜欢分享美食和烹饪技巧。')

  // 第一轮对话
  console.log('[第一轮对话]')
  const userMessage1 = new HumanMessage('你今天吃的什么?')
  await history.addMessage(userMessage1)

  const messages1 = [systemMessage, ...(await history.getMessages())]
  const response1 = await model.invoke(messages1)
  await history.addMessage(response1)

  console.log(`用户: ${userMessage1.content}`)
  console.log(`助手: ${response1.content}\n`)

  // 第二轮对话(基于历史记录)
  console.log('[第二轮对话 - 基于历史记录]')
  const userMessage2 = new HumanMessage('好吃吗?')
  await history.addMessage(userMessage2)

  const messages2 = [systemMessage, ...(await history.getMessages())]
  const response2 = await model.invoke(messages2)
  await history.addMessage(response2)

  console.log(`用户: ${userMessage2.content}`)
  console.log(`助手: ${response2.content}\n`)

  // 展示所有历史消息
  console.log('[历史消息记录]')
  const allMessages = await history.getMessages()
  console.log(`共保存了 ${allMessages.length} 条消息:`)
  allMessages.forEach((msg, index) => {
    const type = msg.type
    const prefix = type === 'human' ? '用户' : '助手'
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`)
  })
}

inMemoryDemo().catch(console.error)
```

运行:

```bash
node src/history-test.mjs
```

### 示例 2:文件持久化(FileSystemChatMessageHistory)

将对话保存到 JSON 文件,支持跨会话恢复:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import path from 'node:path'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

async function fileHistoryDemo() {
  // 指定存储文件的路径
  const filePath = path.join(process.cwd(), 'chat_history.json')
  const sessionId = 'user_session_001'

  // 系统提示词
  const systemMessage = new SystemMessage('你是一个友好的做菜助手,喜欢分享美食和烹饪技巧。')

  console.log('[第一轮对话]')
  const history = new FileSystemChatMessageHistory({
    filePath: filePath,
    sessionId: sessionId,
  })

  const userMessage1 = new HumanMessage('红烧肉怎么做')
  await history.addMessage(userMessage1)

  const messages1 = [systemMessage, ...(await history.getMessages())]
  const response1 = await model.invoke(messages1)
  await history.addMessage(response1)

  console.log(`用户: ${userMessage1.content}`)
  console.log(`助手: ${response1.content}`)
  console.log(`✓ 对话已保存到文件: ${filePath}\n`)

  console.log('[第二轮对话]')
  const userMessage2 = new HumanMessage('好吃吗?')
  await history.addMessage(userMessage2)

  const messages2 = [systemMessage, ...(await history.getMessages())]
  const response2 = await model.invoke(messages2)
  await history.addMessage(response2)

  console.log(`用户: ${userMessage2.content}`)
  console.log(`助手: ${response2.content}`)
  console.log(`✓ 对话已更新到文件\n`)
}

fileHistoryDemo().catch(console.error)
```

运行:

```bash
node src/history-test2.mjs
```

恢复历史对话:

```typescript
const restoredHistory = new FileSystemChatMessageHistory({
  filePath: filePath,
  sessionId: sessionId,
})

const restoredMessages = await restoredHistory.getMessages()
console.log(`从文件恢复了 ${restoredMessages.length} 条历史消息`)
```

运行:

```bash
node src/history-test3.mjs
```

### 示例 3:截断策略(Truncation)

限制历史消息的数量或 token 数,避免上下文过长:

#### 按消息数量截断

```typescript
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { HumanMessage, AIMessage } from '@langchain/core/messages'

async function messageCountTruncation() {
  const history = new InMemoryChatMessageHistory()
  const maxMessages = 4

  // 添加多条消息
  const messages = [
    { type: 'human', content: '我叫张三' },
    { type: 'ai', content: '你好张三,很高兴认识你!' },
    { type: 'human', content: '我今年25岁' },
    { type: 'ai', content: '25岁正是青春年华' },
    { type: 'human', content: '我喜欢编程' },
    { type: 'ai', content: '编程很有趣!' },
  ]

  for (const msg of messages) {
    if (msg.type === 'human') {
      await history.addMessage(new HumanMessage(msg.content))
    } else {
      await history.addMessage(new AIMessage(msg.content))
    }
  }

  let allMessages = await history.getMessages()

  // 保留最近 maxMessages 条消息
  const trimmedMessages = allMessages.slice(-maxMessages)

  console.log(`保留消息数量: ${trimmedMessages.length}`)
  console.log('保留的消息:', trimmedMessages.map((m) => `${m.constructor.name}: ${m.content}`).join('\n  '))
}
```

#### 按 Token 数量截断

```typescript
import { trimMessages } from '@langchain/core/messages'
import { getEncoding } from 'js-tiktoken'

function countTokens(messages, encoder) {
  let total = 0
  for (const msg of messages) {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    total += encoder.encode(content).length
  }
  return total
}

async function tokenCountTruncation() {
  const history = new InMemoryChatMessageHistory()
  const maxTokens = 100

  const enc = getEncoding('cl100k_base')

  // 添加消息...
  const allMessages = await history.getMessages()

  // 使用 trimMessages API
  const trimmedMessages = await trimMessages(allMessages, {
    maxTokens: maxTokens,
    tokenCounter: async (msgs) => countTokens(msgs, enc),
    strategy: 'last', // 保留最近的消息
  })

  const totalTokens = countTokens(trimmedMessages, enc)

  console.log(`总 token 数: ${totalTokens}/${maxTokens}`)
  console.log(`保留消息数量: ${trimmedMessages.length}`)
}

messageCountTruncation()
tokenCountTruncation()
```

运行:

```bash
node src/memory/truncation-memory.mjs
```

### 示例 4:总结策略(Summarization)

将旧对话总结为摘要,压缩上下文:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { HumanMessage, SystemMessage, AIMessage, getBufferString } from '@langchain/core/messages'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

async function summarizeHistory(messages) {
  if (messages.length === 0) return ''

  const conversationText = getBufferString(messages, {
    humanPrefix: '用户',
    aiPrefix: '助手',
  })

  const summaryPrompt = `请总结以下对话的核心内容,保留重要信息:

${conversationText}

总结:`

  const summaryResponse = await model.invoke([new SystemMessage(summaryPrompt)])
  return summaryResponse.content
}

async function summarizationMemoryDemo() {
  const history = new InMemoryChatMessageHistory()
  const maxMessages = 6

  // 添加多条消息...
  const allMessages = await history.getMessages()

  console.log(`原始消息数量: ${allMessages.length}`)

  if (allMessages.length >= maxMessages) {
    const keepRecent = 2

    const recentMessages = allMessages.slice(-keepRecent)
    const messagesToSummarize = allMessages.slice(0, -keepRecent)

    console.log('\n💡 历史消息过多,开始总结...')
    console.log(`📝 将被总结的消息数量: ${messagesToSummarize.length}`)

    const summary = await summarizeHistory(messagesToSummarize)

    await history.clear()
    for (const msg of recentMessages) {
      await history.addMessage(msg)
    }

    console.log(`保留消息数量: ${recentMessages.length}`)
    console.log(`总结内容: ${summary}`)
  }
}

summarizationMemoryDemo().catch(console.error)
```

运行:

```bash
node src/memory/summarization-memory.mjs
```

基于 token 计数的智能总结:

```bash
node src/memory/summarization-memory2.mjs
```

### 示例 5:检索策略(Retrieval)

使用向量数据库检索相关历史对话:

```typescript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { HumanMessage } from '@langchain/core/messages'
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-v3',
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: 1024,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function getEmbedding(text) {
  return await embeddings.embedQuery(text)
}

async function retrieveRelevantConversations(query, k = 2) {
  const queryVector = await getEmbedding(query)

  const searchResult = await client.search({
    collection_name: 'conversations',
    vector: queryVector,
    limit: k,
    metric_type: MetricType.COSINE,
    output_fields: ['id', 'content', 'round', 'timestamp'],
  })

  return searchResult.results
}

async function retrievalMemoryDemo() {
  const history = new InMemoryChatMessageHistory()

  const input = '我之前提到的机器学习项目进展如何?'
  const userMessage = new HumanMessage(input)

  // 检索相关的历史对话
  const retrievedConversations = await retrieveRelevantConversations(input, 2)

  if (retrievedConversations.length > 0) {
    retrievedConversations.forEach((conv, idx) => {
      console.log(`[历史对话 ${idx + 1}] 相似度: ${conv.score.toFixed(4)}`)
      console.log(`内容: ${conv.content}`)
    })

    const relevantHistory = retrievedConversations.map((conv) => `轮次: ${conv.round}\n${conv.content}`).join('\n\n━━━━━\n\n')

    const contextMessages = [new HumanMessage(`相关历史对话:\n${relevantHistory}\n\n用户问题: ${input}`)]

    const response = await model.invoke(contextMessages)
    console.log(`助手: ${response.content}`)
  }
}

retrievalMemoryDemo().catch(console.error)
```

运行(需要先启动 Milvus):

```bash
node src/memory/retrieval-memory.mjs
```

## 常见问题

### 1. 内存泄漏

**问题**: `InMemoryChatMessageHistory` 在长时间运行的服务中会占用大量内存

**解决方案**:

- 使用持久化存储(FileSystemChatMessageHistory、Redis、数据库)
- 定期清理或截断历史消息
- 使用总结策略压缩旧对话

### 2. 上下文长度超限

**问题**: 历史消息过多导致 token 超过模型限制

**解决方案**:

- 使用截断策略限制消息数量
- 使用 token 计数精确控制上下文长度
- 使用总结策略压缩历史信息

### 3. 总结质量不佳

**问题**: AI 总结丢失了关键信息

**解决方案**:

- 优化总结 Prompt,明确要求保留哪些信息
- 调整 `keepRecent` 参数,保留更多原始消息
- 使用结构化总结(如提取实体、关系)

### 4. 文件并发写入冲突

**问题**: 多个会话同时写入同一个文件导致数据损坏

**解决方案**:

- 为每个会话使用不同的 `sessionId`
- 使用支持并发的存储后端(如 Redis、数据库)
- 加文件锁或使用原子写入操作

### 5. 检索结果不相关

**问题**: Retrieval 策略检索到的历史对话与当前问题无关

**解决方案**:

- 调整 `k` 值返回更多候选结果
- 过滤低相似度的结果
- 结合时间窗口(如只检索最近 7 天的对话)
- 优化 Embedding 模型选择

## 注意事项

1. **Token 计算**: 不同模型的 tokenizer 不同,使用 `js-tiktoken` 时需选择正确的编码(如 `cl100k_base` 对应 GPT-4/3.5)
2. **总结成本**: 总结策略会额外调用 LLM API,增加成本和延迟,建议设置合理的触发阈值
3. **向量数据库**: Retrieval 策略需要额外部署向量数据库(如 Milvus、Pinecone),适合大规模生产环境
4. **隐私安全**: 敏感对话内容在持久化存储前应加密,避免明文存储
5. **会话管理**: 使用 `sessionId` 区分不同用户或会话,避免历史混淆

## 相关资源

- [LangChain.js 官方文档 - Memory](https://js.langchain.com/docs/modules/memory/)
- [消息类型详解](https://js.langchain.com/docs/modules/model_io/messages)
- [Token 计数库 js-tiktoken](https://github.com/dqbd/tiktoken)
