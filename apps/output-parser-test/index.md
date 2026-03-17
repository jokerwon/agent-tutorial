---
title: Output Parser 输出解析器指南
description: 介绍 LangChain.js Output Parser 模块的核心用法与示例
---

# Output Parser 输出解析器

## 简介

Output Parser 是 LangChain 中将 LLM 的非结构化文本输出转换为结构化数据的关键组件。通过定义输出格式(如 JSON、XML、结构化对象),Parser 自动生成格式指令并解析响应,让 AI 输出易于在应用中使用,避免手动解析和验证的繁琐工作。

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

::: tip 模型选择
推荐使用 `qwen-plus` 或 `gpt-4` 等能力较强的模型,对复杂结构化输出理解更好。
:::

## 核心概念

### 为什么需要 Output Parser?

LLM 默认返回的是自由文本,直接使用会遇到以下问题:

1. **格式不一致**: 模型可能返回 Markdown、纯文本或带说明的 JSON
2. **难以解析**: 需要手动写正则提取 JSON 或 XML
3. **缺乏验证**: 无法保证字段类型和必填项

Output Parser 解决了这些问题:

```typescript
// ❌ 不使用 Parser - 手动解析容易出错
const response = await model.invoke('介绍爱因斯坦,返回 JSON')
const json = JSON.parse(response.content) // 可能失败!

// ✅ 使用 Parser - 自动解析和验证
const parser = new JsonOutputParser()
const result = await parser.parse(response.content) // 保证成功
```

### Parser 的工作流程

1. **生成格式指令**: `parser.getFormatInstructions()` 生成 Prompt 指令
2. **模型生成**: LLM 按照指令格式输出
3. **自动解析**: `parser.parse()` 将文本转换为结构化数据
4. **类型验证**: 使用 Zod 进行运行时类型检查

### 常用 Parser 类型

| Parser | 输出格式 | 适用场景 |
|--------|---------|---------|
| `JsonOutputParser` | JSON 对象 | 通用结构化数据 |
| `StructuredOutputParser` | JSON + Zod 验证 | 复杂嵌套结构 |
| `XMLOutputParser` | XML 文档 | 需要层次结构的场景 |
| `withStructuredOutput()` | 自动选择最佳方式 | 生产环境推荐 |

## 使用示例

### 示例 1:原始 JSON 输出(不推荐)

最基础的方式,手动要求 JSON 格式:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const question = `请介绍一下爱因斯坦的信息。请以 JSON 格式返回,包含以下字段:
name(姓名)、birth_year(出生年份)、nationality(国籍)、major_achievements(主要成就,数组)、famous_theory(著名理论)。`

try {
  console.log('🤔 正在调用大模型...\n')

  const response = await model.invoke(question)

  console.log('✅ 收到响应:\n')
  console.log(response.content)

  // 手动解析 JSON
  const jsonResult = JSON.parse(response.content)
  console.log('\n📋 解析后的 JSON 对象:')
  console.log(jsonResult)
} catch (error) {
  console.error('❌ 错误:', error.message)
}
```

运行:

```bash
node src/normal.mjs
```

### 示例 2:JsonOutputParser

自动生成格式指令并解析 JSON:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { JsonOutputParser } from '@langchain/core/output_parsers'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const parser = new JsonOutputParser()

// 获取格式指令
const instruction = parser.getFormatInstructions()
console.log('JsonOutputParser instruction:', instruction)

const question = `请介绍一下爱因斯坦的信息。请以 JSON 格式返回,包含以下字段:
name(姓名)、birth_year(出生年份)、nationality(国籍)、major_achievements(主要成就,数组)、famous_theory(著名理论)。

${instruction}`

try {
  console.log('🤔 正在调用大模型(使用 JsonOutputParser)...\n')

  const response = await model.invoke(question)

  console.log('📤 模型原始响应:\n')
  console.log(response.content)

  // 自动解析
  const result = await parser.parse(response.content)

  console.log('✅ JsonOutputParser 自动解析的结果:\n')
  console.log(result)
  console.log(`姓名: ${result.name}`)
  console.log(`出生年份: ${result.birth_year}`)
  console.log(`国籍: ${result.nationality}`)
  console.log(`著名理论: ${result.famous_theory}`)
  console.log(`主要成就:`, result.major_achievements)
} catch (error) {
  console.error('❌ 错误:', error.message)
}
```

运行:

```bash
node src/json-output-parser.mjs
```

### 示例 3:StructuredOutputParser(简单字段)

使用字段名和描述定义输出结构:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 定义输出结构
const parser = StructuredOutputParser.fromNamesAndDescriptions({
  name: '姓名',
  birth_year: '出生年份',
  nationality: '国籍',
  major_achievements: '主要成就,用逗号分隔的字符串',
  famous_theory: '著名理论',
})

const question = `请介绍一下爱因斯坦的信息。

${parser.getFormatInstructions()}`

try {
  console.log('🤔 正在调用大模型(使用 StructuredOutputParser)...\n')

  const response = await model.invoke(question)

  console.log('📤 模型原始响应:\n')
  console.log(response.content)

  const result = await parser.parse(response.content)

  console.log('\n✅ StructuredOutputParser 自动解析的结果:\n')
  console.log(result)
  console.log(`姓名: ${result.name}`)
  console.log(`出生年份: ${result.birth_year}`)
  console.log(`国籍: ${result.nationality}`)
  console.log(`著名理论: ${result.famous_theory}`)
  console.log(`主要成就: ${result.major_achievements}`)
} catch (error) {
  console.error('❌ 错误:', error.message)
}
```

运行:

```bash
node src/structured-output-parser.mjs
```

### 示例 4:StructuredOutputParser + Zod(复杂结构)

使用 Zod 定义复杂的嵌套结构和类型验证:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 使用 zod 定义复杂的输出结构
const scientistSchema = z.object({
  name: z.string().describe('科学家的全名'),
  birth_year: z.number().describe('出生年份'),
  death_year: z.number().optional().describe('去世年份,如果还在世则不填'),
  nationality: z.string().describe('国籍'),
  fields: z.array(z.string()).describe('研究领域列表'),
  awards: z
    .array(
      z.object({
        name: z.string().describe('奖项名称'),
        year: z.number().describe('获奖年份'),
        reason: z.string().optional().describe('获奖原因'),
      }),
    )
    .describe('获得的重要奖项列表'),
  major_achievements: z.array(z.string()).describe('主要成就列表'),
  famous_theories: z
    .array(
      z.object({
        name: z.string().describe('理论名称'),
        year: z.number().optional().describe('提出年份'),
        description: z.string().describe('理论简要描述'),
      }),
    )
    .describe('著名理论列表'),
  education: z
    .object({
      university: z.string().describe('主要毕业院校'),
      degree: z.string().describe('学位'),
      graduation_year: z.number().optional().describe('毕业年份'),
    })
    .optional()
    .describe('教育背景'),
  biography: z.string().describe('简短传记,100字以内'),
})

// 从 zod schema 创建 parser
const parser = StructuredOutputParser.fromZodSchema(scientistSchema)

const question = `请介绍一下居里夫人(Marie Curie)的详细信息,包括她的教育背景、研究领域、获得的奖项、主要成就和著名理论。

${parser.getFormatInstructions()}`

try {
  console.log('🤔 正在调用大模型(使用 Zod Schema)...\n')

  const response = await model.invoke(question)

  console.log('📤 模型原始响应:\n')
  console.log(response.content)

  const result = await parser.parse(response.content)

  console.log('✅ StructuredOutputParser 自动解析并验证的结果:\n')
  console.log(JSON.stringify(result, null, 2))

  console.log('📊 格式化展示:\n')
  console.log(`👤 姓名: ${result.name}`)
  console.log(`📅 出生年份: ${result.birth_year}`)
  if (result.death_year) {
    console.log(`⚰️  去世年份: ${result.death_year}`)
  }
  console.log(`🌍 国籍: ${result.nationality}`)
  console.log(`🔬 研究领域: ${result.fields.join(', ')}`)

  console.log(`\n🎓 教育背景:`)
  if (result.education) {
    console.log(`   院校: ${result.education.university}`)
    console.log(`   学位: ${result.education.degree}`)
  }

  console.log(`\n🏆 获得的奖项 (${result.awards.length}个):`)
  result.awards.forEach((award, index) => {
    console.log(`   ${index + 1}. ${award.name} (${award.year})`)
  })

  console.log(`\n💡 著名理论 (${result.famous_theories.length}个):`)
  result.famous_theories.forEach((theory, index) => {
    console.log(`   ${index + 1}. ${theory.name}`)
    console.log(`      ${theory.description}`)
  })
} catch (error) {
  console.error('❌ 错误:', error.message)
  if (error.name === 'ZodError') {
    console.error('验证错误详情:', error.errors)
  }
}
```

运行:

```bash
node src/structured-output-parser2.mjs
```

### 示例 5:withStructuredOutput(推荐)

最简单的方式,自动选择最佳方法:

```typescript
import 'dotenv/config'
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

// 定义结构化输出的 schema
const scientistSchema = z.object({
  name: z.string().describe('科学家的全名'),
  birth_year: z.number().describe('出生年份'),
  nationality: z.string().describe('国籍'),
  fields: z.array(z.string()).describe('研究领域列表'),
})

// 自动选择最佳方式(支持 tool calls 则用 tool,否则用 output parser)
const structuredModel = model.withStructuredOutput(scientistSchema)

// 调用模型
const result = await structuredModel.invoke('介绍一下爱因斯坦')

console.log('结构化结果:', JSON.stringify(result, null, 2))
console.log(`\n姓名: ${result.name}`)
console.log(`出生年份: ${result.birth_year}`)
console.log(`国籍: ${result.nationality}`)
console.log(`研究领域: ${result.fields.join(', ')}`)
```

运行:

```bash
node src/with-structured-output.mjs
```

### 示例 6:XMLOutputParser

解析 XML 格式的输出:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { XMLOutputParser } from '@langchain/core/output_parsers'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

const parser = new XMLOutputParser()

const question = `请提取以下文本中的人物信息:阿尔伯特·爱因斯坦出生于 1879 年,是一位伟大的物理学家。

${parser.getFormatInstructions()}`

try {
  console.log('🤔 正在调用大模型(使用 XMLOutputParser)...\n')

  const response = await model.invoke(question)

  console.log('📤 模型原始响应:\n')
  console.log(response.content)

  const result = await parser.parse(response.content)

  console.log('\n✅ XMLOutputParser 自动解析的结果:\n')
  console.log(result)
} catch (error) {
  console.error('❌ 错误:', error.message)
}
```

运行:

```bash
node src/xml-output-parser.mjs
```

### 示例 7:流式输出解析

流式接收数据后再解析:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { StructuredOutputParser } from '@langchain/core/output_parsers'
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
  name: z.string().describe('姓名'),
  birth_year: z.number().describe('出生年份'),
  death_year: z.number().describe('去世年份'),
  nationality: z.string().describe('国籍'),
  occupation: z.string().describe('职业'),
  famous_works: z.array(z.string()).describe('著名作品列表'),
  biography: z.string().describe('简短传记'),
})

const parser = StructuredOutputParser.fromZodSchema(schema)

const prompt = `详细介绍莫扎特的信息。\n\n${parser.getFormatInstructions()}`

console.log('🌊 流式结构化输出演示\n')

try {
  const stream = await model.stream(prompt)

  let fullContent = ''
  let chunkCount = 0

  console.log('📡 接收流式数据:\n')

  for await (const chunk of stream) {
    chunkCount++
    const content = chunk.content
    fullContent += content

    process.stdout.write(content) // 实时显示流式文本
  }

  console.log(`\n\n✅ 共接收 ${chunkCount} 个数据块\n`)

  // 解析完整内容为结构化数据
  const result = await parser.parse(fullContent)

  console.log('📊 解析后的结构化结果:\n')
  console.log(JSON.stringify(result, null, 2))

  console.log('\n📝 格式化输出:')
  console.log(`姓名: ${result.name}`)
  console.log(`出生年份: ${result.birth_year}`)
  console.log(`去世年份: ${result.death_year}`)
  console.log(`国籍: ${result.nationality}`)
  console.log(`职业: ${result.occupation}`)
  console.log(`著名作品: ${result.famous_works.join(', ')}`)
  console.log(`传记: ${result.biography}`)
} catch (error) {
  console.error('\n❌ 错误:', error.message)
}
```

运行:

```bash
node src/stream-structured-partial.mjs
```

### 示例 8:Tool Calls 获取结构化输出

使用 Function Calling 获取结构化数据:

```typescript
import 'dotenv/config'
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

// 定义结构化输出的 schema
const scientistSchema = z.object({
  name: z.string().describe('科学家的全名'),
  birth_year: z.number().describe('出生年份'),
  nationality: z.string().describe('国籍'),
  fields: z.array(z.string()).describe('研究领域列表'),
})

const modelWithTool = model.bindTools([
  {
    name: 'extract_scientist_info',
    description: '提取和结构化科学家的详细信息',
    schema: scientistSchema,
  },
])

// 调用模型
const response = await modelWithTool.invoke('介绍一下爱因斯坦')

console.log('response.tool_calls:', response.tool_calls)

// 获取结构化结果
const result = response.tool_calls[0].args

console.log('结构化结果:', JSON.stringify(result, null, 2))
console.log(`\n姓名: ${result.name}`)
console.log(`出生年份: ${result.birth_year}`)
console.log(`国籍: ${result.nationality}`)
console.log(`研究领域: ${result.fields.join(', ')}`)
```

运行:

```bash
node src/tool-call-args.mjs
```

## 常见问题

### 1. 解析失败

**问题**: `parser.parse()` 抛出异常,无法解析模型输出

**解决方案**:
- 检查 Prompt 是否包含 `parser.getFormatInstructions()`
- 降低 `temperature` 为 0,减少随机性
- 使用更强大的模型(如 `qwen-plus` 或 `gpt-4`)
- 在 Prompt 中明确说明"严格按照 JSON 格式输出,不要添加额外说明"

### 2. Zod 验证错误

**问题**: `ZodError: Field 'birth_year' must be number`

**解决方案**:
- 使用 `.optional()` 标记可选字段
- 使用 `.describe()` 为每个字段添加说明,帮助模型理解
- 使用 `.default()` 设置默认值
- 在 describe 中明确数据类型(如"出生年份,数字类型")

### 3. 字段类型不匹配

**问题**: 数组字段返回字符串,或数字字段返回字符串

**解决方案**:
```typescript
// ❌ 不推荐
fields: z.string().describe('研究领域,用逗号分隔')

// ✅ 推荐
fields: z.array(z.string()).describe('研究领域列表')
```

### 4. 输出格式不稳定

**问题**: 同样的 Prompt,有时返回 JSON,有时返回带说明的文本

**解决方案**:
- 使用 `withStructuredOutput()` 替代手动 Prompt
- 在 Prompt 末尾强调:"直接返回 JSON,不要有任何额外说明"
- 使用支持 Function Calling 的模型

### 5. 嵌套结构解析失败

**问题**: 复杂嵌套对象解析失败

**解决方案**:
- 简化 Schema,避免过深嵌套(建议不超过 3 层)
- 为嵌套对象的每个字段添加 `.describe()`
- 拆分为多次调用,分别解析不同部分

## 注意事项

1. **Prompt 设计**: 将 `parser.getFormatInstructions()` 放在 Prompt 末尾,确保模型最后看到格式要求

2. **模型选择**: 复杂结构优先使用 `qwen-plus`、`gpt-4` 等强模型,简单结构可用 `qwen-turbo`

3. **Temperature**: 结构化输出建议设置 `temperature: 0`,提高稳定性

4. **验证**: 使用 Zod 的 `.describe()` 为每个字段添加详细说明,帮助模型理解

5. **性能**: `withStructuredOutput()` 会自动选择最优方式,生产环境推荐使用

6. **调试**: 打印 `parser.getFormatInstructions()` 查看生成的格式指令,确保符合预期

## 相关资源

- [LangChain.js 官方文档 - Output Parsers](https://js.langchain.com/docs/modules/model_io/output_parsers/)
- [Zod Schema 文档](https://zod.dev/)
- [Structured Output 最佳实践](https://js.langchain.com/docs/guides/structured_output)
