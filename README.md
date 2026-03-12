# LangChain 使用指南

基于 `apps/tool-test` 目录下的示例代码，总结 LangChain 的核心用法。

## 目录

1. [快速开始](#快速开始)
2. [工具定义](#工具定义)
3. [工具调用循环](#工具调用循环)
4. [MCP 集成](#mcp-集成)
   - [连接 MCP 服务器](#连接-mcp-服务器)
   - [MCP + Agent 完整示例](#mcp--agent-完整示例)
   - [多 MCP 服务器集成](#多-mcp-服务器集成)
5. [RAG 检索增强生成](#rag-检索增强生成)
   - [RAG 基础概念](#rag-基础概念)
   - [文档加载与分割](#文档加载与分割)
   - [向量存储与检索](#向量存储与检索)
   - [完整 RAG 流程](#完整-rag-流程)
6. [完整示例](#完整示例)
7. [环境变量配置](#环境变量配置)

---

## 快速开始

### 基础对话

最简单的 LangChain 使用方式：

```javascript
import { ChatOpenAI } from '@langchain/openai'

const model = new ChatOpenAI({
  modelName: 'qwen-coder-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const response = await model.invoke('介绍下自己')
console.log(response.content)
```

**要点**：

- 使用 `ChatOpenAI` 创建模型实例
- 支持自定义 `modelName`、`apiKey` 和 `baseURL`
- `model.invoke()` 返回响应对象，`.content` 获取内容

---

## 工具定义

LangChain 使用 `tool()` 函数定义自定义工具，配合 `zod` 进行参数验证。

### 工具定义结构

```javascript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

export const readFileTool = tool(
  // 1. 工具执行函数
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8')
    return `文件内容:\n${content}`
  },
  // 2. 工具配置
  {
    name: 'read_file',
    description: '读取文件内容',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
    }),
  },
)
```

### 示例：文件写入工具

```javascript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import fs from 'fs/promises'
import path from 'node:path'

export const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(filePath, content, 'utf-8')
      return `文件写入成功: ${filePath}`
    } catch (error) {
      return `写入文件失败: ${error.message}`
    }
  },
  {
    name: 'write_file',
    description: '向指定路径写入文件内容，自动创建目录',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
      content: z.string().describe('要写入的文件内容'),
    }),
  },
)
```

**工具定义要点**：

1. 使用 `zod` 定义参数 schema
2. `description` 要清晰说明工具功能
3. 参数使用 `.describe()` 添加说明
4. 返回字符串形式的结果
5. 错误处理：try-catch 并返回友好的错误信息

### 示例：命令执行工具

```javascript
import { spawn } from 'node:child_process'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'

export const executeCommandTool = tool(
  async ({ command, workingDirectory }) => {
    const cwd = workingDirectory || process.cwd()

    return new Promise((resolve) => {
      const child = spawn(command, [], {
        cwd,
        stdio: 'inherit',
        shell: true,
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve(`命令执行成功: ${command}`)
        } else {
          resolve(`命令执行失败，退出码: ${code}`)
        }
      })
    })
  },
  {
    name: 'execute_command',
    description: '执行系统命令',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      workingDirectory: z.string().optional().describe('工作目录'),
    }),
  },
)
```

---

## 工具调用循环

LangChain 的 Agent 核心是工具调用循环：检测工具调用 → 执行工具 → 返回结果 → 继续思考。

### 基本流程

```javascript
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

// 1. 创建模型并绑定工具
const model = new ChatOpenAI({
  /* 配置 */
})
const tools = [readFileTool, writeFileTool]
const modelWithTools = model.bindTools(tools)

// 2. 初始化消息
const messages = [new SystemMessage('你是一个代码助手'), new HumanMessage('请读取 package.json 文件')]

// 3. 工具调用循环
let response = await modelWithTools.invoke(messages)
messages.push(response)

while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`检测到 ${response.tool_calls.length} 个工具调用`)

  // 执行所有工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name)
      const result = await tool.invoke(toolCall.args)
      return result
    }),
  )

  // 将工具结果添加到消息历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    )
  })

  // 再次调用模型
  response = await modelWithTools.invoke(messages)
}

console.log('最终回复:', response.content)
```

### 完整的 Agent 封装

```javascript
async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(`你是一个项目管理助手

当前工作目录: ${process.cwd()}

可用工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令
4. list_directory: 列出目录
    `),
    new HumanMessage(query),
  ]

  for (let i = 0; i < maxIterations; i++) {
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    // 没有工具调用，返回最终结果
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response.content
    }

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name)
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args)
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          }),
        )
      }
    }
  }

  return messages[messages.length - 1].content
}
```

**要点**：

1. 使用 `model.bindTools(tools)` 绑定工具
2. 检查 `response.tool_calls` 判断是否需要执行工具
3. 使用 `ToolMessage` 返回工具执行结果
4. `tool_call_id` 必须与 `toolCall.id` 匹配
5. 消息历史会不断累积，包含所有对话和工具调用

---

## MCP 集成

LangChain 支持 MCP (Model Context Protocol) 服务器集成。

### 连接 MCP 服务器

```javascript
import { MultiServerMCPClient } from '@langchain/mcp-adapters'

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['./my-mcp-server.mjs'],
    },
  },
})

// 获取工具
const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

// 读取资源
const res = await mcpClient.listResources()
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri)
    console.log(content[0].text)
  }
}

// 使用完毕后关闭连接
await mcpClient.close()
```

### MCP + Agent 完整示例

```javascript
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

const model = new ChatOpenAI({
  /* 配置 */
})

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['./my-mcp-server.mjs'],
    },
  },
})

// 读取 MCP 资源作为系统提示
let resourceContent = ''
const res = await mcpClient.listResources()
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri)
    resourceContent += content[0].text
  }
}

// 获取 MCP 工具
const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new SystemMessage(resourceContent), new HumanMessage(query)]

  for (let i = 0; i < maxIterations; i++) {
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response.content
    }

    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name)
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args)
        messages.push(
          new ToolMessage({
            content: toolResult,
            tool_call_id: toolCall.id,
          }),
        )
      }
    }
  }

  return messages[messages.length - 1].content
}

await runAgentWithTools('查询用户信息')
await mcpClient.close()
```

### 多 MCP 服务器集成

LangChain 支持同时连接多个 MCP 服务器，实现强大的工具组合。

```javascript
import 'dotenv/config'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, ToolMessage } from '@langchain/core/messages'

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 同时连接多个 MCP 服务器
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    // 1. 自定义 MCP 服务器
    'my-mcp-server': {
      command: 'node',
      args: ['./my-mcp-server.mjs'],
    },
    // 2. 高德地图 MCP（HTTP 服务）
    'amap-maps-streamableHTTP': {
      url: 'https://mcp.amap.com/mcp?key=' + process.env.AMAP_MAPS_API_KEY,
    },
    // 3. 文件系统 MCP（官方提供）
    filesystem: {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        ...process.env.ALLOWED_PATHS.split(','),
      ],
    },
    // 4. Chrome DevTools MCP
    'chrome-devtools': {
      command: 'npx',
      args: ['-y', 'chrome-devtools-mcp@latest'],
    },
  },
})

// 获取所有 MCP 服务器的工具
const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [new HumanMessage(query)]

  for (let i = 0; i < maxIterations; i++) {
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    // 没有工具调用，返回最终结果
    if (!response.tool_calls || response.tool_calls.length === 0) {
      return response.content
    }

    // 执行工具调用
    for (const toolCall of response.tool_calls) {
      const foundTool = tools.find((t) => t.name === toolCall.name)
      if (foundTool) {
        const toolResult = await foundTool.invoke(toolCall.args)

        // 处理工具返回结果，确保是字符串
        let contentStr
        if (typeof toolResult === 'string') {
          contentStr = toolResult
        } else if (toolResult && toolResult.text) {
          contentStr = toolResult.text
        }

        messages.push(
          new ToolMessage({
            content: contentStr,
            tool_call_id: toolCall.id,
          }),
        )
      }
    }
  }

  return messages[messages.length - 1].content
}

// 示例：查找酒店并在浏览器展示
await runAgentWithTools(
  '北京南站附近的酒店，找到最近的 3 个酒店，获取酒店图片，' +
    '打开浏览器展示每个酒店的图片，每个 tab 展示一个酒店，' +
    '并将页面标题改为酒店名',
)
```

**MCP 服务器类型**：

1. **本地命令型**：通过 `command` 和 `args` 启动本地进程
   ```javascript
   filesystem: {
     command: 'npx',
     args: ['-y', '@modelcontextprotocol/server-filesystem', '/path']
   }
   ```

2. **HTTP 服务型**：通过 `url` 连接远程 MCP 服务
   ```javascript
   'amap-maps': {
     url: 'https://mcp.amap.com/mcp?key=YOUR_KEY'
   }
   ```

**多服务器优势**：
- 工具能力互补（地图 + 文件系统 + 浏览器控制）
- 统一的工具调用接口
- 灵活的服务器组合
- 支持本地和远程服务

---

## RAG 检索增强生成

RAG (Retrieval-Augmented Generation) 是一种结合检索和生成的技术，通过检索相关文档来增强 AI 的回答能力。

### RAG 基础概念

**核心流程**：
```
文档 → 分割 → 嵌入(Embedding) → 向量存储
                                    ↓
用户提问 → 嵌入 → 相似度检索 → 获取相关文档 → 构建 Prompt → AI 回答
```

**关键组件**：
1. **Document Loader**: 文档加载器（网页、PDF、TXT 等）
2. **Text Splitter**: 文本分割器（将长文档切成小块）
3. **Embeddings**: 嵌入模型（将文本转为向量）
4. **Vector Store**: 向量存储（存储和检索向量）
5. **Retriever**: 检索器（根据问题检索相关文档）

### 文档加载与分割

LangChain 提供了多种文档加载器和分割器。

#### 示例：加载网页并分割

```javascript
import 'dotenv/config'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// 1. 加载网页内容
const loader = new CheerioWebBaseLoader('https://example.com/article', {
  selector: '.article-content p', // CSS 选择器，提取指定内容
})

const documents = await loader.load()
console.log(`原始文档字符数: ${documents[0].pageContent.length}`)

// 2. 分割文档
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,        // 每个分块的最大字符数
  chunkOverlap: 50,      // 分块之间的重叠字符数（保持上下文连贯）
  separators: ['。', '！', '？', '\n', ' '], // 分隔符优先级
})

const splitDocuments = await textSplitter.splitDocuments(documents)
console.log(`分割后的文档数量: ${splitDocuments.length}`)

// 查看分割结果
splitDocuments.forEach((doc, i) => {
  console.log(`\n[分块 ${i + 1}]`)
  console.log(doc.pageContent)
  console.log(`元数据:`, doc.metadata)
})
```

**Text Splitter 参数说明**：
- `chunkSize`: 每个分块的大小（字符数）
- `chunkOverlap`: 分块之间的重叠部分（避免语义被截断）
- `separators`: 分隔符列表，按优先级尝试

**常用的文档加载器**：
- `CheerioWebBaseLoader`: 网页加载
- `PDFLoader`: PDF 文档
- `TextLoader`: 纯文本
- `JSONLoader`: JSON 文件
- `DirectoryLoader`: 目录批量加载

### 向量存储与检索

LangChain 使用向量存储来保存文档的嵌入向量，并支持相似度检索。

#### 示例：基础 RAG 流程

```javascript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

// 1. 创建模型和嵌入
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

// 2. 创建文档（手动创建）
const documents = [
  new Document({
    pageContent: '光光是一个活泼开朗的小男孩，他特别喜欢踢足球。',
    metadata: { chapter: 1, character: '光光' },
  }),
  new Document({
    pageContent: '东东是光光最好的朋友，他是一个安静而聪明的男孩。',
    metadata: { chapter: 2, character: '东东' },
  }),
  // ...更多文档
]

// 3. 创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings)

// 4. 创建检索器
const retriever = vectorStore.asRetriever({ k: 3 }) // 检索最相关的 3 个文档

// 5. 检索相关文档
const question = '东东和光光是怎么成为朋友的？'
const retrievedDocs = await retriever.invoke(question)

// 6. 查看相似度评分
const scoredResults = await vectorStore.similaritySearchWithScore(question, 3)

scoredResults.forEach(([doc, score], i) => {
  const similarity = (1 - score).toFixed(4) // 将距离转为相似度
  console.log(`[文档 ${i + 1}] 相似度: ${similarity}`)
  console.log(`内容: ${doc.pageContent}`)
  console.log(`元数据:`, doc.metadata)
})

// 7. 构建 Prompt 并生成回答
const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n')

const prompt = `你是一个故事助手。基于以下故事片段回答问题：

故事片段:
${context}

问题: ${question}

你的回答:`

const response = await model.invoke(prompt)
console.log(response.content)
```

**关键概念**：
- **Embeddings（嵌入）**: 将文本转换为高维向量，相似的内容向量距离更近
- **Vector Store（向量存储）**: 存储文档向量，支持相似度搜索
- **Retriever（检索器）**: 封装向量存储，提供统一的检索接口
- **相似度评分**: 距离越小，相似度越高（通常用 `1 - distance` 表示）

### 完整 RAG 流程

结合文档加载、分割、向量存储和检索的完整示例。

#### 示例：网页内容 RAG

```javascript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'

// 1. 初始化模型
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

// 2. 加载文档
const loader = new CheerioWebBaseLoader('https://example.com/article', {
  selector: '.content p',
})
const documents = await loader.load()
console.log(`原始文档: ${documents[0].pageContent.length} 字符`)

// 3. 分割文档
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['。', '！', '？', '\n'],
})

const splitDocuments = await textSplitter.splitDocuments(documents)
console.log(`分割完成: ${splitDocuments.length} 个分块`)

// 4. 创建向量存储
console.log('创建向量存储...')
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocuments, embeddings)
console.log('向量存储创建完成')

// 5. 创建检索器
const retriever = vectorStore.asRetriever({ k: 2 })

// 6. RAG 问答
async function askQuestion(question) {
  console.log('='.repeat(80))
  console.log(`问题: ${question}`)
  console.log('='.repeat(80))

  // 检索相关文档
  const scoredResults = await vectorStore.similaritySearchWithScore(question, 2)
  const retrievedDocs = scoredResults.map(([doc]) => doc)

  // 显示检索结果
  console.log('\n【检索到的文档】')
  scoredResults.forEach(([doc, score], i) => {
    const similarity = (1 - score).toFixed(4)
    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`)
    console.log(`内容: ${doc.pageContent}`)
  })

  // 构建 Prompt
  const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n━━━━━\n\n')

  const prompt = `你是一个文章阅读助手，根据文章内容解答问题：

文章内容：
${context}

问题: ${question}

你的回答:`

  // 生成回答
  console.log('\n【AI 回答】')
  const response = await model.invoke(prompt)
  console.log(response.content)
  console.log('\n')
}

// 使用示例
await askQuestion('文章的主要观点是什么？')
await askQuestion('作者为什么会有这样的感悟？')
```

### RAG 最佳实践

1. **文档分割**：
   - `chunkSize` 通常设置 300-1000 字符
   - `chunkOverlap` 设置为 `chunkSize` 的 10-20%
   - 选择合适的 `separators`（中文用标点符号）

2. **检索策略**：
   - `k` 值通常设置 2-5（太多会引入噪音）
   - 使用相似度评分过滤低质量结果
   - 考虑使用 MMR（最大边际相关性）增加多样性

3. **Prompt 设计**：
   - 明确说明"基于提供的内容回答"
   - 要求 AI 在内容不足时诚实说明
   - 可以要求 AI 引用来源片段

4. **向量存储选择**：
   - `MemoryVectorStore`: 适合开发和测试（内存存储）
   - 生产环境推荐使用：Pinecone、Weaviate、Chroma、Milvus 等

5. **Metadata 利用**：
   - 为文档添加丰富的元数据（章节、作者、时间等）
   - 可以基于元数据进行过滤检索

---

## 完整示例

### 示例 1：文件读取助手

```javascript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { readFileTool } from './tools/file-read.mjs'

const model = new ChatOpenAI({
  modelName: 'qwen-coder-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const tools = [readFileTool]
const modelWithTools = model.bindTools(tools)

const messages = [new SystemMessage('你是一个代码助手，可以读取文件并解释代码'), new HumanMessage('请读取 package.json 文件')]

let response = await modelWithTools.invoke(messages)
messages.push(response)

while (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    const tool = tools.find((t) => t.name === toolCall.name)
    const result = await tool.invoke(toolCall.args)
    messages.push(
      new ToolMessage({
        content: result,
        tool_call_id: toolCall.id,
      }),
    )
  }

  response = await modelWithTools.invoke(messages)
}

console.log(response.content)
```

### 示例 2：项目管理助手

参考 `apps/tool-test/src/mini-cursor.mjs`，这是一个功能完整的 Agent，可以：

- 创建项目
- 修改代码
- 执行命令
- 管理依赖

核心特性：

- 多工具协同
- 清晰的系统提示
- 错误处理
- 迭代限制（防止��限循环）

### 示例 3：多 MCP 服务器协同

参考 `apps/tool-test/src/mcp-test.mjs`，这是一个展示多 MCP 服务器协同工作的复杂 Agent：

**功能特性**：
- 同时连接 4 个 MCP 服务器（自定义、高德地图、文件系统、Chrome DevTools）
- 复杂任务流程：查找地点 → 获取路线 → 写入文件 → 浏览器展示
- 跨服务器的工具调用和结果整合

**应用场景**：
```javascript
// 查找酒店 + 获取路线 + 保存文档
await runAgentWithTools(
  '北京南站附近的5个酒店，以及去的路线，' +
    '路线规划生成文档保存到桌面的 md 文件',
)

// 查找酒店 + 浏览器展示图片
await runAgentWithTools(
  '北京南站附近的酒店，找到最近的 3 个酒店，' +
    '获取酒店图片，打开浏览器展示每个酒店的图片',
)
```

**核心价值**：
- 展示了真实世界中多工具协同的复杂场景
- 证明了 LangChain + MCP 的强大组合能力
- 提供了生产级 Agent 的参考实现

### 示例 4：RAG 文档问答系统

参考 `apps/rag-test/src/hello-rag.mjs` 和 `apps/rag-test/src/loader-and-splitter2.mjs`，展示了完整的 RAG 流程：

**示例 A：基于自定义文档的问答**

```javascript
import 'dotenv/config'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

const model = new ChatOpenAI({ /* 配置 */ })
const embeddings = new OpenAIEmbeddings({ /* 配置 */ })

// 创建自定义文档
const documents = [
  new Document({
    pageContent: '光光是一个活泼开朗的小男孩...',
    metadata: { chapter: 1, character: '光光' },
  }),
  // ...更多文档
]

// 创建向量存储和检索器
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings)
const retriever = vectorStore.asRetriever({ k: 3 })

// RAG 问答
const question = '东东和光光是怎么成为朋友的？'
const retrievedDocs = await retriever.invoke(question)
const scoredResults = await vectorStore.similaritySearchWithScore(question, 3)

// 显示检索结果和相似度
scoredResults.forEach(([doc, score], i) => {
  const similarity = (1 - score).toFixed(4)
  console.log(`[文档 ${i + 1}] 相似度: ${similarity}`)
})

// 生成回答
const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n')
const prompt = `基于以下故事片段回答问题：\n\n${context}\n\n问题: ${question}`
const response = await model.invoke(prompt)
```

**示例 B：基于网页内容的问答**

```javascript
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

// 1. 加载网页
const loader = new CheerioWebBaseLoader('https://juejin.cn/post/12345', {
  selector: '.main-area p',
})
const documents = await loader.load()

// 2. 分割文档
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ['。', '！', '？'],
})
const splitDocuments = await textSplitter.splitDocuments(documents)

// 3. 创建向量存储
const vectorStore = await MemoryVectorStore.fromDocuments(splitDocuments, embeddings)
const retriever = vectorStore.asRetriever({ k: 2 })

// 4. 问答
const question = '文章的主要观点是什么？'
const scoredResults = await vectorStore.similaritySearchWithScore(question, 2)
const retrievedDocs = scoredResults.map(([doc]) => doc)

// 5. 生成回答
const context = retrievedDocs.map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`).join('\n\n')
const prompt = `你是文章阅读助手，根据内容回答：\n\n${context}\n\n问题: ${question}`
const response = await model.invoke(prompt)
```

**核心价值**：
- 展示了 RAG 在知识库问答中的应用
- 对比了手动创建文档和自动加载网页两种方式
- 演示了文档分割和相似度检索的最佳实践
- 适用于构建文档问答系统、知识库助手等应用

---

## 核心概念总结

### 消息类型

- **HumanMessage**: 用户消息
- **SystemMessage**: 系统提示
- **ToolMessage**: 工具执行结果
- **AIMessage**: AI 回复（包含 `tool_calls`）

### 工具调用流程

```
1. 用户提问
   ↓
2. AI 决定是否调用工具
   ↓
3. 执行工具并获取结果
   ↓
4. 将结果返回给 AI
   ↓
5. AI 继续思考（可能再次调用工具���
   ↓
6. AI 给出最终回答
```

### RAG 核心组件

- **Document**: 文档对象（包含 `pageContent` 和 `metadata`）
- **Document Loader**: 文档加载器（网页、PDF、TXT 等）
- **Text Splitter**: 文本分割器（将长文档切分为小块）
- **Embeddings**: 嵌入模型（文本转向量）
- **Vector Store**: 向量存储（存储和检索向量）
- **Retriever**: 检索器（根据问题检索相关文档）

### RAG 工作流程

```
离线阶段：
文档 → 加载(Load) → 分割(Split) → 嵌入(Embed) → 向量存储(Vector Store)

在线阶段：
用户提问 → 嵌入 → 相似度检索 → 获取相关文档 → 构建 Prompt → AI 回答
```

### 最佳实践

1. **工具定义**：
   - 描述要清晰、具体
   - 参数要有详细的 `.describe()`
   - 错误处理要友好

2. **系统提示**：
   - 明确 AI 的角色和能力
   - 说明可用工具及其用途
   - 提供工作流程指导

3. **消息管理**：
   - 保持消息历史完整
   - 正确关联 `tool_call_id`
   - 控制消息长度（避免 token 超限）

4. **循环控制**：
   - 设置最大迭代次数
   - 监控 token 使用
   - 及时返回结果

5. **MCP 集成**：
   - 合理组合多个 MCP 服务器（本地 + 远程）
   - 处理工具返回结果的类型转换（字符串/对象）
   - 使用完毕后关闭 MCP 客户端��接
   - 环境变量管理 API 密钥（如地图服务）
   - 错误处理：捕获 MCP 服务器连接失败的情况

---

## 依赖安装

### 基础依赖（tool-test）

```bash
cd apps/tool-test
pnpm add @langchain/openai @langchain/core @langchain/mcp-adapters zod dotenv
```

### RAG 依赖（rag-test）

```bash
cd apps/rag-test
pnpm add @langchain/openai @langchain/core @langchain/classic @langchain/community @langchain/textsplitters dotenv cheerio zod
```

**依赖说明**：
- `@langchain/openai`: OpenAI 模型和嵌入
- `@langchain/core`: 核心功能（消息、文档等）
- `@langchain/mcp-adapters`: MCP 服务器集成
- `@langchain/classic`: 向量存储等经典功能
- `@langchain/community`: 社区提供的文档加载器
- `@langchain/textsplitters`: 文本分割器
- `cheerio`: HTML 解析（网页加载器需要）
- `zod`: 参数验证
- `dotenv`: 环境变量管理

## 运行示例

### 环境变量配置

创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

`.env` 文件内容示例：

```env
# OpenAI API 配置（必需）
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4

# 嵌入模型配置（运行 RAG 示例需要）
EMBEDDINGS_MODEL_NAME=text-embedding-ada-002

# 高德地图 API（运行 mcp-test.mjs 需要）
AMAP_MAPS_API_KEY=your_amap_key_here

# 文件系统访问路径（运行 mcp-test.mjs 需要，多个路径用逗号分隔）
ALLOWED_PATHS=/Users/yourname/Desktop,/Users/yourname/Documents
```

### 运行命令

**基础示例（tool-test）**：

```bash
cd apps/tool-test

# 运行基础示例
node src/hello-langchain.mjs

# 运行工具调用示例
node src/tool-file-read.mjs

# 运行完整 Agent
node src/mini-cursor.mjs

# 运行 MCP 集成示例
node src/langchain-mcp-test.mjs

# 运行多 MCP 服务器示例（需要配置 AMAP_MAPS_API_KEY 和 ALLOWED_PATHS）
node src/mcp-test.mjs
```

**RAG 示例（rag-test）**：

```bash
cd apps/rag-test

# 运行基础 RAG 示例（自定义文档问答）
node src/hello-rag.mjs

# 运行文档加载与分割示例
node src/loader-and-splitter.mjs

# 运行网页内容 RAG 完整流程
node src/loader-and-splitter2.mjs
```

## 参考资源

### LangChain 相关

- [LangChain 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangChain GitHub](https://github.com/langchain-ai/langchainjs)
- [Zod 文档](https://zod.dev/)

### MCP 相关

- [MCP 协议官方文档](https://modelcontextprotocol.io/)
- [MCP 官方服务器列表](https://github.com/modelcontextprotocol/servers)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchainjs/tree/main/libs/mcp-adapters)
- [高德地图 MCP](https://lbs.amap.com/api/mcp/summary)

### RAG 相关

- [LangChain RAG 文档](https://js.langchain.com/docs/tutorials/rag/)
- [向量存储对比](https://js.langchain.com/docs/integrations/vectorstores/)
- [文档加载器列表](https://js.langchain.com/docs/integrations/document_loaders/)
- [文本分割器指南](https://js.langchain.com/docs/modules/data_connection/document_transformers/)

### 示例代码

**tool-test 示例**：
- `apps/tool-test/src/hello-langchain.mjs` - 基础用法
- `apps/tool-test/src/tool-file-read.mjs` - 工具调用
- `apps/tool-test/src/mini-cursor.mjs` - 完整 Agent
- `apps/tool-test/src/langchain-mcp-test.mjs` - 单 MCP 服务器
- `apps/tool-test/src/mcp-test.mjs` - 多 MCP 服务器协同

**rag-test 示例**：
- `apps/rag-test/src/hello-rag.mjs` - RAG 基础示例
- `apps/rag-test/src/loader-and-splitter.mjs` - 文档加载与分割
- `apps/rag-test/src/loader-and-splitter2.mjs` - 完整网页 RAG 流程
