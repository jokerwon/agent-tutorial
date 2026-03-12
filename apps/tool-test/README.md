# LangChain Tools 使用指南

这份指南将带你从零开始学习 LangChain Tools，通过实际的代码示例掌握如何让 AI 模型使用工具完成任务。

## 📚 目录

1. [什么是 LangChain Tools？](#什么是-langchain-tools)
2. [准备工作](#准备工作)
3. [入门示例：创建你的第一个工具](#入门示例创建你的第一个工具)
4. [基础用法：单工具调用](#基础用法单工具调用)
5. [进阶用法：多工具 Agent](#进阶用法多工具-agent)
6. [高级用法：MCP 工具集成](#高级用法mcp-工具集成)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)

---

## 什么是 LangChain Tools？

LangChain Tools 是一个让 AI 模型能够调用外部功能的机制。通过工具，你可以让 AI：

- 📁 读取和写入文件
- 💻 执行系统命令
- 🔍 搜索网络或数据库
- 🌐 调用外部 API
- 📊 处理数据

简单来说，Tools 让 AI 从"只会说话"变成"能干活"！

---

## 准备工作

### 安装依赖

```bash
pnpm install @langchain/openai @langchain/core zod dotenv
```

### 配置环境变量

创建 `.env` 文件：

```env
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
MODEL_NAME=gpt-4
```

### 基础代码结构

```javascript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})
```

---

## 入门示例：创建你的第一个工具

让我们从最简单的工具开始：一个读取文件的工具。

### 步骤 1：定义工具

创建 `tools/file-read.mjs`：

```javascript
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import fs from 'fs/promises'

export const readFileTool = tool(
  // 1. 工具的执行函数
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8')
    return `文件内容:\n${content}`
  },
  {
    // 2. 工具的元数据
    name: 'read_file',
    description: '用此工具来读取文件内容。输入文件路径（可以是相对路径或绝对路径）。',
    // 3. 参数 schema（使用 Zod）
    schema: z.object({
      filePath: z.string().describe('文件路径'),
    }),
  },
)
```

**关键概念：**

- `tool()` 函数接收两个参数：
  1. **执行函数**：定义工具具体做什么
  2. **配置对象**：包含 `name`、`description` 和 `schema`
- `name`：工具的名称，AI 会用这个名称调用工具
- `description`：告诉 AI 这个工具是做什么的（非常重要！）
- `schema`：使用 Zod 定义参数的结构和类型

### 步骤 2：绑定工具到模型

创建 `hello-tool.mjs`：

```javascript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { readFileTool } from './tools/file-read.mjs'

// 创建模型
const model = new ChatOpenAI({
  modelName: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
})

// 将工具绑定到模型
const tools = [readFileTool]
const modelWithTools = model.bindTools(tools)
```

### 步骤 3：让 AI 使用工具

现在你已经准备好让 AI 使用工具了！在下一节，我们将看到完整的执行流程。

---

## 基础用法：单工具调用

参考：`src/tool-file-read.mjs`

这是一个完整的示例，展示如何让 AI 读取文件并解释代码：

```javascript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { readFileTool } from './tools/file-read.mjs'

// 1. 创建模型并绑定工具
const model = new ChatOpenAI({
  modelName: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
})

const tools = [readFileTool]
const modelWithTools = model.bindTools(tools)

// 2. 初始化消息
const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容`),
  new HumanMessage('请读取 src/tool-file-read.mjs 文件内容并解释代码'),
]

// 3. 第一次调用模型
let response = await modelWithTools.invoke(messages)
messages.push(response)

// 4. 处理工具调用的循环
while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`)

  // 执行所有工具调用
  for (const toolCall of response.tool_calls) {
    const tool = tools.find((t) => t.name === toolCall.name)

    if (tool) {
      console.log(`[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`)

      // 执行工具
      const result = await tool.invoke(toolCall.args)

      // 将工具结果添加到消息历史
      messages.push(
        new ToolMessage({
          content: result,
          tool_call_id: toolCall.id,
        }),
      )
    }
  }

  // 再次调用模型，传入工具结果
  response = await modelWithTools.invoke(messages)
}

// 5. 输出最终回复
console.log('\n[最终回复]')
console.log(response.content)
```

**执行流程：**

```
用户提问
    ↓
AI 决定调用工具
    ↓
执行工具并获取结果
    ↓
AI 基于工具结果生成回复
```

**核心概念：**

- `HumanMessage`：用户的消息
- `SystemMessage`：给 AI 的指令
- `ToolMessage`：工具执行结果
- `tool_calls`：模型返回的工具调用请求
- 循环处理：持续执行工具调用直到 AI 不再需要调用工具

---

## 进阶用法：多工具 Agent

参考：`src/mini-cursor.mjs`

当你有多个工具时，可以创建一个强大的 Agent 来完成复杂任务。这个示例展示了如何创建一个项目管理助手：

### 定义多个工具

**1. 文件写入工具** (`tools/file-write.mjs`)：

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

**2. 命令执行工具** (`tools/execute-command.mjs`)：

```javascript
import { spawn } from 'node:child_process'
import z from 'zod'
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
    description: '执行系统命令，支持指定工作目录',
    schema: z.object({
      command: z.string().describe('要执行的命令'),
      workingDirectory: z.string().optional().describe('工作目录'),
    }),
  },
)
```

**3. 目录列出工具** (`tools/list-directory.mjs`)：

```javascript
import fs from 'fs/promises'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'

export const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      const files = await fs.readdir(directoryPath)
      return `目录内容:\n${files.map((f) => `- ${f}`).join('\n')}`
    } catch (error) {
      return `列出目录失败: ${error.message}`
    }
  },
  {
    name: 'list_directory',
    description: '列出指定目录下的所有文件和文件夹',
    schema: z.object({
      directoryPath: z.string().describe('目录路径'),
    }),
  },
)
```

### 创建 Agent 循环

```javascript
import chalk from 'chalk'

const tools = [readFileTool, writeFileTool, executeCommandTool, listDirectoryTool]
const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query, maxIterations = 30) {
  const messages = [
    new SystemMessage(`你是一个项目管理助手，使用工具完成任务。

当前工作目录: ${process.cwd()}

工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令
4. list_directory: 列出目录

回复要简洁，只说做了什么`),
    new HumanMessage(query),
  ]

  // 循环执行直到任务完成
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))
    const response = await modelWithTools.invoke(messages)
    messages.push(response)

    // 如果没有工具调用，说明任务完成
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`\n✨ AI 最终回复:\n${response.content}\n`)
      return response.content
    }

    // 执行所有工具调用
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
}

// 使用示例
await runAgentWithTools(`
  创建一个 React 应用：
  1. 使用 pnpm create vite 创建项目
  2. 安装依赖
  3. 修改 App.tsx 添加一个计数器
  4. 列出目录确认
`)
```

**Agent 的工作流程：**

```
1. 用户提出任务
   ↓
2. AI 分析任务，决定使用哪些工具
   ↓
3. 执行工具调用
   ↓
4. AI 检查结果，决定下一步
   ↓
5. 重复 2-4 直到任务完成
   ↓
6. 返回最终结果
```

---

## 高级用法：MCP 工具集成

参考：`src/langchain-mcp-test.mjs`

MCP (Model Context Protocol) 允许你使用外部工具服务器：

```javascript
import { MultiServerMCPClient } from '@langchain/mcp-adapters'

// 1. 创建 MCP 客户端
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    'my-mcp-server': {
      command: 'node',
      args: ['./src/my-mcp-server.mjs'],
    },
  },
})

// 2. 读取 MCP 资源
let resourceContent = ''
const res = await mcpClient.listResources()
for (const [serverName, resources] of Object.entries(res)) {
  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri)
    resourceContent += content[0].text
  }
}

// 3. 获取 MCP 工具
const tools = await mcpClient.getTools()
const modelWithTools = model.bindTools(tools)

// 4. 使用工具（和前面一样）
const messages = [
  new SystemMessage(resourceContent),
  new HumanMessage('查询用户信息'),
]

// ... 后续处理与普通工具相同

// 5. 记得关闭连接
await mcpClient.close()
```

**MCP 的优势：**

- 🔌 即插即用的工具服务器
- 📦 工具可以独立部署和扩展
- 🔄 支持动态加载工具
- 🌐 可以连接多个工具服务器

---

## 最佳实践

### 1. 工具描述要清晰

```javascript
// ❌ 不好的描述
description: '读取文件'

// ✅ 好的描述
description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。'
```

### 2. 参数使用 Zod 进行验证

```javascript
schema: z.object({
  filePath: z.string().describe('文件路径'),  // 清晰的描述
  content: z.string().describe('要写入的文件内容'),
  workingDirectory: z.string().optional().describe('可选的工作目录'),  // 可选参数
})
```

### 3. 错误处理

```javascript
export const myTool = tool(
  async ({ param }) => {
    try {
      // 执行操作
      return '成功'
    } catch (error) {
      // 返回友好的错误信息
      return `操作失败: ${error.message}`
    }
  },
  { /* ... */ }
)
```

### 4. System Prompt 要明确

```javascript
new SystemMessage(`你是一个助手，可以使用工具完成任务。

工作流程：
1. 分析用户需求
2. 选择合适的工具
3. 执行并检查结果
4. 给出回复

重要规则：
- 每次只调用必要的工具
- 检查工具返回的错误信息
- 如果工具失败，尝试其他方法
`)
```

### 5. 限制循环次数

```javascript
async function runAgentWithTools(query, maxIterations = 30) {
  for (let i = 0; i < maxIterations; i++) {
    // 防止无限循环
  }
}
```

### 6. 记录日志

```javascript
async ({ filePath }) => {
  console.log(`[工具调用] read_file("${filePath}")`)
  const content = await fs.readFile(filePath, 'utf-8')
  console.log(`[工具调用] 成功读取 ${content.length} 字节`)
  return `文件内容:\n${content}`
}
```

---

## 常见问题

### Q1: AI 不调用工具怎么办？

**原因：**
- 工具描述不清楚
- System Prompt 没有指示使用工具
- 用户请求不需要工具

**解决：**
```javascript
// 1. 改进工具描述
description: '必须使用此工具来读取文件！当用户提到文件时，立即调用此工具。'

// 2. 明确 System Prompt
new SystemMessage(`当用户要求读取文件时，你必须立即调用 read_file 工具。不要猜测文件内容！`)
```

### Q2: 工具调用参数不正确？

**原因：**
- Schema 定义不清晰
- 参数描述不够详细

**解决：**
```javascript
schema: z.object({
  filePath: z.string().describe('文件的完整路径，例如：src/components/App.tsx'),
  // 更具体的描述
})
```

### Q3: 如何调试工具调用？

```javascript
// 查看模型返回的工具调用
console.log('Tool calls:', response.tool_calls)

// 查看完整的消息历史
console.log('Messages:', messages)

// 查看工具执行结果
console.log('Tool result:', toolResult)
```

### Q4: 多个工具之间的依赖关系？

让 AI 自己处理！只需要在 System Prompt 中说明：

```javascript
new SystemMessage(`你可以使用以下工具：
1. read_file: 读取文件
2. write_file: 写入文件
3. execute_command: 执行命令

根据任务需求，自动决定工具的使用顺序。`)
```

### Q5: 如何让工具返回结构化数据？

```javascript
import { z } from 'zod'

export const jsonTool = tool(
  async ({ param }) => {
    const result = { status: 'success', data: [] }
    return JSON.stringify(result)  // 返回 JSON 字符串
  },
  {
    name: 'json_tool',
    description: '返回 JSON 格式的数据',
    schema: z.object({
      param: z.string(),
    }),
  }
)
```

---

## 总结

通过本指南，你学会了：

✅ 如何定义和使用 LangChain Tools
✅ 单工具和多工具的使用场景
✅ Agent 循环的工作原理
✅ MCP 工具集成
✅ 最佳实践和调试技巧

**下一步建议：**

1. 尝试运行 `src/tool-file-read.mjs` 体验基础用法
2. 运行 `src/mini-cursor.mjs` 看看多工具 Agent 的威力
3. 创建自己的工具来扩展功能
4. 探索 MCP 生态系统中的更多工具

## 更多资源

- [LangChain 官方文档](https://python.langchain.com/docs/get_started/introduction)
- [LangChain.js GitHub](https://github.com/langchain-ai/langchainjs)
- [Zod 文档](https://zod.dev/)

---

**Happy Coding! 🎉**

如果你觉得这份指南有帮助，欢迎分享给其他初学者！
