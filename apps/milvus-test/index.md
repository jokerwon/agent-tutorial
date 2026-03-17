---
title: Milvus 向量数据库集成指南
description: 介绍 LangChain.js 与 Milvus 向量数据库的集成用法
---

# Milvus 向量数据库集成

## 简介

Milvus 是一款高性能、开源的向量数据库,专为海量向量数据的存储、索引和检索而设计。通过将 Embedding 向量存入 Milvus,可以实现毫秒级的相似度搜索,广泛应用于 RAG、推荐系统、图像检索等场景。LangChain 提供了与 Milvus 的无缝集成,简化向量存储和检索流程。

## 环境配置

### 安装 Milvus

使用 Docker 快速启动 Milvus:

```bash
# 下载 Milvus standalone docker-compose 配置
curl -sfL https://raw.githubusercontent.com/milvus-io/milvus/master/scripts/standalone_embed.sh -o standalone_embed.sh

# 启动 Milvus
bash standalone_embed.sh start
```

验证 Milvus 是否运行:

```bash
# 检查容器状态
docker ps | grep milvus

# Milvus 默认端口
# gRPC: 19530
# HTTP: 9091
```

### 配置环境变量

在 `.env` 文件中配置以下环境变量:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-coder-turbo
EMBEDDINGS_MODEL_NAME=text-embedding-v3

# Milvus 连接配置(可选,默认为 localhost:19530)
MILVUS_ADDRESS=localhost:19530
```

::: tip 端口说明
Milvus 默认使用 19530 端口提供 gRPC 服务,9091 端口提供 HTTP API。确保防火墙已开放相应端口。
:::

## 核心概念

### Collection 集合

Collection 类似于关系数据库中的表,用于存储同类型的向量数据。每个 Collection 需要定义:

- **字段(Field)**: 包括主键、向量字段和标量字段
- **向量维度(dim)**: 必须与 Embedding 模型输出维度一致
- **索引(Index)**: 加速向量检索的数据结构

```typescript
import { MilvusClient, DataType, IndexType, MetricType } from '@zilliz/milvus2-sdk-node'

await client.createCollection({
  collection_name: 'my_collection',
  fields: [
    { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
    { name: 'vector', data_type: DataType.FloatVector, dim: 1024 },
    { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
  ],
})
```

### Embedding 嵌入向量

Embedding 是将文本转换为高维向量的过程,语义相似的文本向量距离更近:

```typescript
import { OpenAIEmbeddings } from '@langchain/openai'

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-v3',
  dimensions: 1024, // 向量维度
})

const vector = await embeddings.embedQuery('这是要转换的文本')
```

### 相似度度量

Milvus 支持多种相似度计算方法:

- **COSINE(余弦相似度)**: 适合文本语义相似度,范围 [-1, 1]
- **L2(欧氏距离)**: 适合图像特征,距离越小越相似
- **IP(内积)**: 适合归一化向量,值越大越相似

```typescript
const searchResult = await client.search({
  collection_name: 'my_collection',
  vector: queryVector,
  metric_type: MetricType.COSINE, // 使用余弦相似度
  limit: 10,
})
```

## 使用示例

### 示例 1:创建集合并插入数据

创建日记 Collection 并插入向量数据:

```typescript
import 'dotenv/config'
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node'
import { OpenAIEmbeddings } from '@langchain/openai'

const COLLECTION_NAME = 'ai_diary'
const VECTOR_DIM = 1024

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function getEmbedding(text) {
  return await embeddings.embedQuery(text)
}

async function main() {
  // 连接到 Milvus
  console.log('Connecting to Milvus...')
  await client.connectPromise
  console.log('✓ Connected\n')

  // 创建集合
  console.log('Creating collection...')
  await client.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      { name: 'id', data_type: DataType.VarChar, max_length: 50, is_primary_key: true },
      { name: 'vector', data_type: DataType.FloatVector, dim: VECTOR_DIM },
      { name: 'content', data_type: DataType.VarChar, max_length: 5000 },
      { name: 'date', data_type: DataType.VarChar, max_length: 50 },
      { name: 'mood', data_type: DataType.VarChar, max_length: 50 },
      { name: 'tags', data_type: DataType.Array, element_type: DataType.VarChar, max_capacity: 10, max_length: 50 },
    ],
  })
  console.log('Collection created')

  // 创建索引
  console.log('\nCreating index...')
  await client.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: 'vector',
    index_type: IndexType.IVF_FLAT,
    metric_type: MetricType.COSINE,
    params: { nlist: 1024 },
  })
  console.log('Index created')

  // 加载集合到内存
  console.log('\nLoading collection...')
  await client.loadCollection({ collection_name: COLLECTION_NAME })
  console.log('Collection loaded')

  // 插入日记数据
  console.log('\nInserting diary entries...')
  const diaryContents = [
    {
      id: 'diary_001',
      content: '今天天气很好,去公园散步了,心情愉快。看到了很多花开了,春天真美好。',
      date: '2026-01-10',
      mood: 'happy',
      tags: ['生活', '散步'],
    },
    {
      id: 'diary_002',
      content: '今天工作很忙,完成了一个重要的项目里程碑。团队合作很愉快,感觉很有成就感。',
      date: '2026-01-11',
      mood: 'excited',
      tags: ['工作', '成就'],
    },
    {
      id: 'diary_003',
      content: '周末和朋友去爬山,天气很好,心情也很放松。享受大自然的感觉真好。',
      date: '2026-01-12',
      mood: 'relaxed',
      tags: ['户外', '朋友'],
    },
  ]

  // 生成向量
  console.log('Generating embeddings...')
  const diaryData = await Promise.all(
    diaryContents.map(async (diary) => ({
      ...diary,
      vector: await getEmbedding(diary.content),
    })),
  )

  // 插入数据
  const insertResult = await client.insert({
    collection_name: COLLECTION_NAME,
    data: diaryData,
  })
  console.log(`✓ Inserted ${insertResult.insert_cnt} records\n`)
}

main().catch(console.error)
```

运行:

```bash
node src/insert.mjs
```

### 示例 2:向量相似度搜索

搜索语义相似的日记:

```typescript
import 'dotenv/config'
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node'
import { OpenAIEmbeddings } from '@langchain/openai'

const COLLECTION_NAME = 'ai_diary'
const VECTOR_DIM = 1024

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: VECTOR_DIM,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function getEmbedding(text) {
  return await embeddings.embedQuery(text)
}

async function main() {
  console.log('Connecting to Milvus...')
  await client.connectPromise
  console.log('✓ Connected\n')

  // 向量搜索
  console.log('Searching for similar diary entries...')
  const query = '我做饭或学习的日记'
  console.log(`Query: "${query}"\n`)

  const queryVector = await getEmbedding(query)
  const searchResult = await client.search({
    collection_name: COLLECTION_NAME,
    vector: queryVector,
    limit: 2,
    metric_type: MetricType.COSINE,
    output_fields: ['id', 'content', 'date', 'mood', 'tags'],
  })

  console.log(`Found ${searchResult.results.length} results:\n`)
  searchResult.results.forEach((item, index) => {
    console.log(`${index + 1}. [Score: ${item.score.toFixed(4)}]`)
    console.log(`   ID: ${item.id}`)
    console.log(`   Date: ${item.date}`)
    console.log(`   Mood: ${item.mood}`)
    console.log(`   Tags: ${item.tags?.join(', ')}`)
    console.log(`   Content: ${item.content}\n`)
  })
}

main().catch(console.error)
```

运行:

```bash
node src/query.mjs
```

### 示例 3:更新数据

使用 upsert 更新已有记录:

```typescript
import 'dotenv/config'
import { MilvusClient } from '@zilliz/milvus2-sdk-node'
import { OpenAIEmbeddings } from '@langchain/openai'

const COLLECTION_NAME = 'ai_diary'
const VECTOR_DIM = 1024

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: VECTOR_DIM,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function getEmbedding(text) {
  return await embeddings.embedQuery(text)
}

async function main() {
  console.log('Connecting to Milvus...')
  await client.connectPromise
  console.log('✓ Connected\n')

  // 更新数据(Milvus 通过 upsert 实现更新)
  console.log('Updating diary entry...')
  const updateId = 'diary_001'
  const updatedContent = {
    id: updateId,
    content: '今天下了一整天的雨,心情很糟糕。工作上遇到了很多困难,感觉压力很大。',
    date: '2026-01-10',
    mood: 'sad',
    tags: ['生活', '压力'],
  }

  console.log('Generating new embedding...')
  const vector = await getEmbedding(updatedContent.content)
  const updateData = { ...updatedContent, vector }

  const result = await client.upsert({
    collection_name: COLLECTION_NAME,
    data: [updateData],
  })

  console.log(`✓ Updated diary entry: ${updateId}`)
  console.log(`  New content: ${updatedContent.content}`)
  console.log(`  New mood: ${updatedContent.mood}`)
  console.log(`  New tags: ${updatedContent.tags.join(', ')}\n`)
}

main().catch(console.error)
```

运行:

```bash
node src/update.mjs
```

### 示例 4:删除数据

按 ID 或条件删除记录:

```typescript
import 'dotenv/config'
import { MilvusClient } from '@zilliz/milvus2-sdk-node'

const COLLECTION_NAME = 'ai_diary'

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function main() {
  console.log('Connecting to Milvus...')
  await client.connectPromise
  console.log('✓ Connected\n')

  // 删除单条数据
  console.log('Deleting diary entry...')
  const deleteId = 'diary_005'

  const result = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id == "${deleteId}"`,
  })

  console.log(`✓ Deleted ${result.delete_cnt} record(s)`)
  console.log(`  ID: ${deleteId}\n`)

  // 批量删除
  console.log('Batch deleting diary entries...')
  const deleteIds = ['diary_002', 'diary_003']
  const idsStr = deleteIds.map((id) => `"${id}"`).join(', ')

  const batchResult = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id in [${idsStr}]`,
  })

  console.log(`✓ Batch deleted ${batchResult.delete_cnt} record(s)`)
  console.log(`  IDs: ${deleteIds.join(', ')}\n`)

  // 条件删除
  console.log('Deleting by condition...')
  const conditionResult = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `mood == "sad"`,
  })

  console.log(`✓ Deleted ${conditionResult.delete_cnt} record(s) with mood="sad"\n`)
}

main().catch(console.error)
```

运行:

```bash
node src/delete.mjs
```

### 示例 5:结合 RAG 的完整流程

使用 Milvus 实现 RAG 检索增强生成:

```typescript
import 'dotenv/config'
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'

const COLLECTION_NAME = 'ai_diary'
const VECTOR_DIM = 1024

const model = new ChatOpenAI({
  temperature: 0.7,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: VECTOR_DIM,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function getEmbedding(text) {
  return await embeddings.embedQuery(text)
}

async function retrieveRelevantDiaries(question, k = 2) {
  const queryVector = await getEmbedding(question)

  const searchResult = await client.search({
    collection_name: COLLECTION_NAME,
    vector: queryVector,
    limit: k,
    metric_type: MetricType.COSINE,
    output_fields: ['id', 'content', 'date', 'mood', 'tags'],
  })

  return searchResult.results
}

async function answerDiaryQuestion(question, k = 2) {
  console.log('='.repeat(80))
  console.log(`问题: ${question}`)
  console.log('='.repeat(80))

  // 1. 检索相关日记
  console.log('\n【检索相关日记】')
  const retrievedDiaries = await retrieveRelevantDiaries(question, k)

  if (retrievedDiaries.length === 0) {
    console.log('未找到相关日记')
    return '抱歉,我没有找到相关的日记内容。'
  }

  // 2. 打印检索到的日记及相似度
  retrievedDiaries.forEach((diary, i) => {
    console.log(`\n[日记 ${i + 1}] 相似度: ${diary.score.toFixed(4)}`)
    console.log(`日期: ${diary.date}`)
    console.log(`心情: ${diary.mood}`)
    console.log(`标签: ${diary.tags?.join(', ')}`)
    console.log(`内容: ${diary.content}`)
  })

  // 3. 构建上下文
  const context = retrievedDiaries
    .map((diary, i) => {
      return `[日记 ${i + 1}]
日期: ${diary.date}
心情: ${diary.mood}
标签: ${diary.tags?.join(', ')}
内容: ${diary.content}`
    })
    .join('\n\n━━━━━\n\n')

  // 4. 构建 prompt
  const prompt = `你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题,用亲切自然的语言。

请根据以下日记内容回答问题:
${context}

用户问题: ${question}

回答要求:
1. 如果日记中有相关信息,请结合日记内容给出详细、温暖的回答
2. 可以总结多篇日记的内容,找出共同点或趋势
3. 如果日记中没有相关信息,请温和地告知用户
4. 用第一人称"你"来称呼日记的作者
5. 回答要有同理心,让用户感到被理解和关心

AI 助手的回答:`

  // 5. 调用 LLM 生成回答
  console.log('\n【AI 回答】')
  const response = await model.invoke(prompt)
  console.log(response.content)
  console.log('\n')

  return response.content
}

async function main() {
  console.log('连接到 Milvus...')
  await client.connectPromise
  console.log('✓ 已连接\n')

  await answerDiaryQuestion('我最近做了什么让我感到快乐的事情?', 2)
}

main().catch(console.error)
```

运行:

```bash
node src/rag.mjs
```

### 示例 6:电子书 RAG(进阶)

将整本电子书导入 Milvus 并实现智能问答:

```typescript
import 'dotenv/config'
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'

const COLLECTION_NAME = 'ebook_collection'
const VECTOR_DIM = 1024

const model = new ChatOpenAI({
  temperature: 0.7,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.EMBEDDINGS_MODEL_NAME,
  dimensions: VECTOR_DIM,
})

const client = new MilvusClient({
  address: 'localhost:19530',
})

async function retrieveRelevantContent(question, k = 3) {
  const queryVector = await embeddings.embedQuery(question)

  const searchResult = await client.search({
    collection_name: COLLECTION_NAME,
    vector: queryVector,
    limit: k,
    metric_type: MetricType.COSINE,
    output_fields: ['id', 'book_id', 'chapter_num', 'index', 'content'],
  })

  return searchResult.results
}

async function answerEbookQuestion(question, k = 3) {
  console.log('='.repeat(80))
  console.log(`问题: ${question}`)
  console.log('='.repeat(80))

  // 1. 检索相关内容
  console.log('\n【检索相关内容】')
  const retrievedContent = await retrieveRelevantContent(question, k)

  if (retrievedContent.length === 0) {
    console.log('未找到相关内容')
    return '抱歉,我没有找到相关的内容。'
  }

  // 2. 打印检索到的内容及相似度
  retrievedContent.forEach((item, i) => {
    console.log(`\n[片段 ${i + 1}] 相似度: ${item.score.toFixed(4)}`)
    console.log(`书籍: ${item.book_id}`)
    console.log(`章节: 第 ${item.chapter_num} 章`)
    console.log(`内容: ${item.content.substring(0, 200)}...`)
  })

  // 3. 构建上下文
  const context = retrievedContent
    .map((item, i) => {
      return `[片段 ${i + 1}]
章节: 第 ${item.chapter_num} 章
内容: ${item.content}`
    })
    .join('\n\n━━━━━\n\n')

  // 4. 构建 prompt
  const prompt = `你是一个专业的小说助手。基于小说内容回答问题,用准确、详细的语言。

请根据以下小说片段内容回答问题:
${context}

用户问题: ${question}

回答要求:
1. 如果片段中有相关信息,请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容,提供完整的答案
3. 如果片段中没有相关信息,请如实告知用户
4. 回答要准确,符合小说的情节和人物设定

AI 助手的回答:`

  // 5. 调用 LLM 生成回答
  console.log('\n【AI 回答】')
  const response = await model.invoke(prompt)
  console.log(response.content)
  console.log('\n')

  return response.content
}

async function main() {
  console.log('连接到 Milvus...')
  await client.connectPromise
  console.log('✓ 已连接\n')

  await answerEbookQuestion('鸠摩智会什么武功?', 5)
}

main().catch(console.error)
```

运行(需要先导入电子书数据):

```bash
# 先导入电子书
node src/ebook-writer.mjs

# 再进行问答
node src/ebook-reader-rag.mjs
```

## 常见问题

### 1. 连接失败

**问题**: 无法连接到 Milvus 服务器

**解决方案**:

- 检查 Milvus 容器是否正在运行: `docker ps | grep milvus`
- 验证端口是否开放: `telnet localhost 19530`
- 查看 Milvus 日志: `docker logs milvus-standalone`

### 2. 向量维度不匹配

**问题**: 插入数据时报错"dimension not match"

**解决方案**:

- 确保 Embedding 模型的 `dimensions` 参数与 Collection 的 `dim` 一致
- 常用维度: OpenAI `text-embedding-3-small` = 1536, `text-embedding-v3` 可自定义(如 1024)

### 3. 检索速度慢

**问题**: 向量搜索响应时间长

**解决方案**:

- 创建合适的索引类型(IVF_FLAT、IVF_SQ8、HNSW)
- 调整索引参数(如 `nlist`)
- 增加 `limit` 值以减少计算量
- 使用分区(Partition)减少搜索范围

### 4. 内存占用过高

**问题**: Milvus 占用大量内存

**解决方案**:

- 使用 IVF_SQ8 索引进行向量压缩
- 启用数据落盘(Release Collection)
- 调整 `cache.insert_rate` 参数
- 使用分布式部署分散负载

### 5. 数据持久化

**问题**: 容器重启后数据丢失

**解决方案**:

- 使用 Docker Volume 挂载数据目录:
  ```bash
  docker run -d --name milvus \
    -v /path/to/milvus:/var/lib/milvus \
    -p 19530:19530 \
    milvusdb/milvus:latest
  ```

## 注意事项

1. **索引类型选择**:
   - **FLAT**: 精确搜索,适合小数据集(< 10万)
   - **IVF_FLAT**: 平衡精度和速度,适合中等数据集
   - **IVF_SQ8**: 压缩向量,节省内存,适合大数据集
   - **HNSW**: 高性能近似搜索,适合实时性要求高的场景

2. **相似度阈值**: COSINE 相似度通常设置 0.7-0.8 为阈值,低于此值的结果可能不相关

3. **批量操作**: 插入大量数据时使用批量插入(如每次 1000 条),避免频繁请求

4. **集合管理**: 定期清理不需要的 Collection,释放内存和磁盘空间

5. **监控指标**: 关注 Milvus 的 QPS、延迟、内存使用等指标,及时扩容

## 相关资源

- [Milvus 官方文档](https://milvus.io/docs)
- [Milvus Node.js SDK](https://github.com/milvus-io/milvus-sdk-node)
- [LangChain Milvus 集成](https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/milvus)
- [向量索引类型对比](https://milvus.io/docs/index.md)
