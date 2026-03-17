---
title: Tool 模块使用指南
description: 介绍 LangChain.js Tool 模块的核心用法与示例
---

# Tool 模块

## 简介

Tool 模块是 LangChain.js 中让 LLM 具备"行动能力"的关键组件。通过 Tool,你可以将外部功能(如文件操作、API 调用、命令执行等)封装成标准接口,让模型自主决定何时调用、如何调用,从而实现复杂的自动化任务。

## 环境配置

在 `.env` 文件中配置以下环境变量:

```bash
# OpenAI API 配置
OPENAI_API_KEY=YOUR_API_KEY
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型配置(可选)
MODEL_NAME=qwen-coder-turbo
EMBEDDINGS_MODEL_NAME=text-embedding-v3

# 高德地图 API(可选)
AMAP_MAPS_API_KEY=YOUR_AMAP_KEY

# 文件操作权限路径
ALLOWED_PATHS=/path/to/allowed/dir1,/path/to/allowed/dir2
```

::: warning 安全提示
`ALLOWED_PATHS` 用于限制文件操作工具的访问范围,建议仅开放必要的工作目录。
:::

## 核心概念

### Tool 的定义

Tool 由三个核心部分组成:

1. **执行函数**: 实际执行的异步逻辑
2. **名称(name)**: 工具的唯一标识符
3. **描述(description)**: 告诉模型该工具的用途和使用时机
4. **参数模式(schema)**: 使用 Zod 定义工具参数的结构和类型

### 基础示例:文件读取工具

```typescript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import fs from 'fs/promises'

export const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8')
    console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`)
    return `文件内容:\n${content}`
  },
  {
    name: 'read_file',
    description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时,调用此工具。输入文件路径(可以是相对路径或绝对路径)。',
    schema: z.object({
      filePath: z.string().describe('文件路径'),
    }),
  },
)
```

### 工具绑定与调用

将工具绑定到模型:

```typescript
import { ChatOpenAI } from '@langchain/openai'

const model = new ChatOpenAI({
  modelName: 'qwen-coder-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const tools = [readFileTool, writeFileTool]
const modelWithTools = model.bindTools(tools)
```

### 消息循环机制

Tool 的核心是"感知-决策-执行"的循环:

```typescript
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

const messages = [
  new SystemMessage('你是一个代码助手,可以使用工具读取文件并解释代码。'),
  new HumanMessage('请读取 src/index.ts 文件内容并解释代码'),
]

let response = await modelWithTools.invoke(messages)
messages.push(response)

// 循环执行工具调用
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

## 使用示例

### 示例 1:单工具调用

最基础的示例,让模型读取文件并解释代码:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { readFileTool } from './tools/file-read.mjs'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || 'qwen-coder-turbo',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const tools = [readFileTool]
const modelWithTools = model.bindTools(tools)

const messages = [
  new SystemMessage(`你是一个代码助手,可以使用工具读取文件并解释代码。
可用工具:
- read_file: 读取文件内容`),
  new HumanMessage('请读取 src/tool-file-read.mjs 文件内容并解释代码'),
]

let response = await modelWithTools.invoke(messages)
messages.push(response)

while (response.tool_calls && response.tool_calls.length > 0) {
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name)
      const result = await tool.invoke(toolCall.args)
      return result
    }),
  )

  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      }),
    )
  })

  response = await modelWithTools.invoke(messages)
}

console.log('\n[最终回复]')
console.log(response.content)
```

运行:

```bash
node src/tool-file-read.mjs
```

### 示例 2:多工具 Agent(Mini Cursor)

实现一个类似 Cursor 的自动化 Agent,能自主创建项目、编写代码、执行命令:

```typescript
import 'dotenv/config'
import chalk from 'chalk'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { readFileTool } from './tools/file-read.mjs'
import { writeFileTool } from './tools/file-write.mjs'
import { executeCommandTool } from './tools/execute-command.mjs'
import { listDirectoryTool } from './tools/list-directory.mjs'

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const tools = [readFileTool, writeFileTool, executeCommandTool, listDirectoryTool]
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(`你是一个项目管理助手,使用工具完成任务。
工具:
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令
4. list_directory: 列出目录`),
    new HumanMessage(query),
  ]

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`)
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

const task = `创建一个 React TodoList 应用:
1. 使用 pnpm create vite react-todo-app --template react-ts 创建项目
2. 修改 src/App.tsx 实现完整的 TodoList 功能
3. 添加渐变背景和动画效果
4. 列出目录确认`

await runAgentWithTools(task)
```

运行:

```bash
node src/mini-cursor.mjs
```

### 示例 3:MCP (Model Context Protocol) 集成

使用 MCP 协议连接外部工具服务器:

```typescript
import 'dotenv/config'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'

const model = new ChatOpenAI({
  modelName: 'qwen-plus',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 连接 MCP Server
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['./src/my-mcp-server.mjs'],
    },
  },
})

// 读取 MCP 资源
const res = await mcpClient.listResources()
let resourceContent = ''
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri)
    resourceContent += content[0].text
  }
}

// 获取 MCP 工具
const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

const messages = [
  new SystemMessage(resourceContent),
  new HumanMessage('MCP Server 的使用指南是什么?'),
]

const response = await modelWithTools.invoke(messages)
console.log(response.content)

await mcpClient.close()
```

运行:

```bash
node src/langchain-mcp-test.mjs
```

## 常见问题

### 1. 工具未被调用

**问题**:模型直接回答问题而没有使用工具

**解决**:
- 检查工具的 `description` 是否清晰明确
- 在 SystemMessage 中明确指示何时使用工具
- 提高模型的 `temperature` 可能导致不稳定,建议设为 0

### 2. 工具调用无限循环

**问题**:Agent 持续调用工具而不给出最终回复

**解决**:
- 设置 `maxIterations` 限制最大循环次数
- 在 SystemMessage 中明确任务完成条件
- 检查工具返回的内容是否符合预期

### 3. 参数验证失败

**问题**:工具调用时参数类型或格式错误

**解决**:
- 使用 Zod 的 `.describe()` 为每个参数添加说明
- 在 schema 中使用 `.optional()` 和 `.default()` 处理可选参数
- 在工具执行函数中添加容错逻辑

### 4. 并发工具调用

LangChain 支持一次调用多个工具,可以使用 `Promise.all` 并发执行:

```typescript
const toolResults = await Promise.all(
  response.tool_calls.map(async (toolCall) => {
    const tool = tools.find((t) => t.name === toolCall.name)
    return await tool.invoke(toolCall.args)
  }),
)
```

## 注意事项

1. **安全性**: 文件操作和命令执行工具需要严格的权限控制,避免路径穿越和命令注入
2. **成本控制**: 每次工具调用都会产生 API 调用,设置合理的 `maxIterations` 可以避免意外成本
3. **错误处理**: 工具执行失败时应返回友好的错误信息,而非抛出异常中断流程
4. **调试**: 使用 `console.log` 记录工具调用过程,便于追踪 Agent 的决策路径
5. **模型选择**: 推荐使用 `qwen-plus` 或 `qwen-coder-turbo` 等支持 Function Calling 的模型

## 相关资源

- [LangChain.js 官方文档 - Tools](https://js.langchain.com/docs/modules/tools/)
- [Zod Schema 文档](https://zod.dev/)
- [MCP 协议规范](https://modelcontextprotocol.io/)
