---
title: RAG 检索增强生成指南
description: 介绍 LangChain.js RAG 模块的核心用法与示例
---

# RAG 检索增强生成

## 简介

RAG(Retrieval-Augmented Generation,检索增强生成)是一种结合外部知识库和 LLM 的技术。它先从文档库中检索相关内容,再将检索结果作为上下文提供给模型,从而让模型基于最新、准确的信息生成回答,有效解决知识过时和幻觉问题。

## 环境配置

在 `.env` 文件中配置以下环境变量:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-coder-turbo
EMBEDDINGS_MODEL_NAME=text-embedding-v3
```

::: tip 模型选择
RAG 需要使用 Embedding 模型将文本转换为向量,推荐使用 `text-embedding-v3` 或 `text-embedding-ada-002`。
:::

## 核心概念

### RAG 的工作流程

RAG 包含三个核心步骤:

1. **文档加载与分割**: 从文件、网页等来源加载原始文档,并按语义分割成小块
2. **向量化与存储**: 使用 Embedding 模型将文本块转换为向量,存入向量数据库
3. **检索与生成**: 根据用户问题检索相关文档,结合上下文让 LLM 生成回答

### Document 对象

LangChain 使用 `Document` 对象表示文本片段:

```typescript
import { Document } from '@langchain/core/documents'

const doc = new Document({
  pageContent: '这是文档的实际内容',
  metadata: {
    source: 'example.txt',
    page: 1,
    author: '张三',
  },
})
```

- `pageContent`: 文档的文本内容
- `metadata`: 元数据(来源、页码、作者等),用于追溯和筛选

### Embedding 嵌入模型

Embedding 将文本转换为高维向量,语义相似的文本向量距离更近:

```typescript
import { OpenAIEmbeddings } from '@langchain/openai'

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const vector = await embeddings.embedQuery('光光是一个活泼的男孩')
console.log(vector.length) // 输出: 1536 (维度取决于模型)
```

### VectorStore 向量存储

VectorStore 负责存储向量并支持相似度检索:

```typescript
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

// 从文档创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings)

// 转换为检索器(可设置返回 top-k 个结果)
const retriever = vectorStore.asRetriever({ k: 3 })

// 检索相关文档
const relevantDocs = await retriever.invoke('东东是谁?')
```

### TextSplitter 文本分割器

长文档需要分割成小块以提高检索精度:

```typescript
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // 每个分块的最大字符数
  chunkOverlap: 50,    // 分块之间的重叠字符数
  separators: ['。', '!', '?'], // 分割符优先级
})

const splitDocs = await textSplitter.splitDocuments(documents)
```

## 使用示例

### 示例 1:基础 RAG 流程

使用内存向量存储实现一个简单的 RAG 问答系统:

```typescript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

// 初始化模型
const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 初始化嵌入模型
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 创建文档
const documents = [
  new Document({
    pageContent: `光光是一个活泼开朗的小男孩,他有一双明亮的大眼睛,总是带着灿烂的笑容。光光最喜欢的事情就是和朋友们一起玩耍,他特别擅长踢足球。`,
    metadata: {
      chapter: 1,
      character: '光光',
      type: '角色介绍',
    },
  }),
  new Document({
    pageContent: `东东是光光最好的朋友,他是一个安静而聪明的男孩。东东喜欢读书和画画,他的画总是充满了想象力。`,
    metadata: {
      chapter: 2,
      character: '东东',
      type: '角色介绍',
    },
  }),
]

// 创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings)
const retriever = vectorStore.asRetriever({ k: 3 })

// 检索相关文档
const question = '东东和光光是怎么成为朋友的?'
const retrievedDocs = await retriever.invoke(question)

// 检索相似度评分
const scoredResults = await vectorStore.similaritySearchWithScore(question, 3)

// 打印检索结果
console.log('\n【检索到的文档及相似度评分】')
retrievedDocs.forEach((doc, i) => {
  const scoredResult = scoredResults.find(([scoredDoc]) => scoredDoc.pageContent === doc.pageContent)
  const score = scoredResult ? scoredResult[1] : null
  const similarity = score !== null ? (1 - score).toFixed(4) : 'N/A'

  console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`)
  console.log(`内容: ${doc.pageContent}`)
  console.log(`元数据: 章节=${doc.metadata.chapter}, 角色=${doc.metadata.character}`)
})

// 构建 Prompt
const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n━━━━━\n\n')

const prompt = `你是一个讲友情故事的老师。基于以下故事片段回答问题,用温暖生动的语言。

故事片段:
${context}

问题: ${question}

老师的回答:`

// 生成回答
const response = await model.invoke(prompt)
console.log('\n【AI 回答】')
console.log(response.content)
```

运行:

```bash
node src/hello-rag.mjs
```

### 示例 2:文档加载与分割

从网页加载文档并进行分割:

```typescript
import 'dotenv/config'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// 加载网页内容
const loader = new CheerioWebBaseLoader('https://juejin.cn/post/7233327509919547452', {
  selector: '.main-area p', // 只提取段落内容
})

const documents = await loader.load()
console.log(`Total characters: ${documents[0].pageContent.length}`)

// 创建文本分割器
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 400,        // 每个分块的字符数
  chunkOverlap: 50,      // 分块之间的重叠字符数
  separators: ['。', '!', '?'], // 分割符,优先使用段落分隔
})

// 分割文档
const splitDocuments = await textSplitter.splitDocuments(documents)

console.log(splitDocuments)
console.log(`文档分割完成,共 ${splitDocuments.length} 个分块`)
```

运行:

```bash
node src/loader-and-splitter.mjs
```

### 示例 3:完整的 Web 文档 RAG

从网页加载、分割、向量化、检索、生成的完整流程:

```typescript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'

// 初始化模型
const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,
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
})

// 1. 加载网页文档
const loader = new CheerioWebBaseLoader('https://juejin.cn/post/7233327509919547452', {
  selector: '.main-area p',
})

const documents = await loader.load()
console.log(`Total characters: ${documents[0].pageContent.length}`)

// 2. 分割文档
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['。', '!', '?'],
})

const splitDocuments = await textSplitter.splitDocuments(documents)
console.log(`文档分割完成,共 ${splitDocuments.length} 个分块\n`)

// 3. 创建向量存储
console.log('正在创建向量存储...')
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocuments, embeddings)
console.log('向量存储创建完成\n')

const retriever = vectorStore.asRetriever({ k: 2 })

// 4. RAG 检索与生成
const questions = ['父亲的去世对作者的人生态度产生了怎样的根本性逆转?']

for (const question of questions) {
  console.log('='.repeat(80))
  console.log(`问题: ${question}`)
  console.log('='.repeat(80))

  // 获取文档和相似度评分
  const scoredResults = await vectorStore.similaritySearchWithScore(question, 2)
  const retrievedDocs = scoredResults.map(([doc]) => doc)

  // 打印检索结果
  console.log('\n【检索到的文档及相似度评分】')
  scoredResults.forEach(([doc, score], i) => {
    const similarity = (1 - score).toFixed(4)

    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`)
    console.log(`内容: ${doc.pageContent}`)
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      console.log(`元数据:`, doc.metadata)
    }
  })

  // 构建 Prompt
  const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n━━━━━\n\n')

  const prompt = `你是一个文章辅助阅读助手,根据文章内容来解答:

文章内容:
${context}

问题: ${question}

你的回答:`

  console.log('\n【AI 回答】')
  const response = await model.invoke(prompt)
  console.log(response.content)
  console.log('\n')
}
```

运行:

```bash
node src/loader-and-splitter2.mjs
```

## 常见问题

### 1. 检索结果不准确

**问题**: 检索到的文档与问题相关性不高

**解决方案**:
- 调整 `chunkSize` 和 `chunkOverlap`,找到合适的分块大小
- 增加 `k` 值以返回更多候选文档
- 优化 Embedding 模型选择,推荐使用专门针对中文优化的模型
- 在 metadata 中添加更多结构化信息,便于过滤

### 2. 上下文长度超限

**问题**: 检索到的文档过多,导致 Prompt 超过模型 token 限制

**解决方案**:
- 减小 `k` 值或 `chunkSize`
- 使用 `similaritySearchWithScore` 获取评分,过滤低分文档
- 在 Prompt 中截断过长的上下文
- 使用支持长上下文的模型(如 Claude 200K)

### 3. 内存占用过高

**问题**: `MemoryVectorStore` 将所有向量加载到内存,大文档集会导致内存溢出

**解决方案**:
- 使用持久化向量数据库(如 Pinecone、Milvus、Chroma)
- 分批处理文档,避免一次性加载过多
- 考虑使用 FAISS 等高效的向量检索库

### 4. 相似度评分解读

**问题**: 不理解 `similaritySearchWithScore` 返回的评分含义

**说明**:
- 返回的是"距离"而非相似度,值越小越相似
- 余弦距离范围:[0, 2],0 表示完全相同,2 表示完全相反
- 通常使用 `1 - score` 转换为相似度:[0, 1],1 表示最相似

```typescript
const scoredResults = await vectorStore.similaritySearchWithScore(query, k)
scoredResults.forEach(([doc, score]) => {
  const similarity = 1 - score // 转换为相似度
  console.log(`相似度: ${similarity.toFixed(4)}`)
})
```

## 注意事项

1. **分块策略**: 根据文档类型选择合适的分割符和分块大小,代码文档建议按函数/类分割,文章建议按段落分割
2. **重叠窗口**: `chunkOverlap` 可以避免语义被截断,但会增加存储开销,建议设置为 `chunkSize` 的 10%-20%
3. **元数据管理**: 充分利用 metadata 记录来源、时间、作者等信息,便于追溯和过滤
4. **模型一致性**: Embedding 模型一旦选定,后续检索时必须使用同一模型,否则向量空间不匹配
5. **成本控制**: Embedding API 按 token 计费,大文档集建议本地缓存向量,避免重复调用

## 相关资源

- [LangChain.js 官方文档 - RAG](https://js.langchain.com/docs/modules/data_connection/)
- [文本分割最佳实践](https://js.langchain.com/docs/modules/data_connection/document_transformers/)
- [向量数据库对比](https://js.langchain.com/docs/modules/data_connection/vectorstores/)
