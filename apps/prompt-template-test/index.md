---
title: Prompt Template 提示词模板指南
description: 介绍 LangChain.js Prompt Template 模块的核心用法与示例
---

# Prompt Template 提示词模板

## 简介

Prompt Template 是 LangChain 中管理和复用提示词的核心工具。它将动态变量嵌入到固定的模板文本中,支持参数化、模块化和组合式 Prompt 设计,避免手动拼接字符串,提高代码可读性和可维护性。无论是单轮对话还是多轮对话,Prompt Template 都能让你的提示词更加结构化和易于管理。

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
Prompt Template 与具体模型无关,但推荐使用 `qwen-plus` 或 `gpt-4` 等强模型以获得更好的理解效果。
:::

## 核心概念

### 为什么需要 Prompt Template?

直接拼接字符串会遇到以下问题:

```typescript
// ❌ 不使用 Template - 字符串拼接难以维护
const prompt = `你是一名${role},请帮我${task}。公司:${company},团队:${team}...`

// ✅ 使用 Template - 清晰、可复用
const template = PromptTemplate.fromTemplate(`
  你是一名{role},请帮我{task}。
  公司:{company},团队:{team}...
`)
const prompt = await template.format({ role, task, company, team })
```

### 模板变量

使用 `{variable_name}` 语法定义变量占位符:

```typescript
const template = PromptTemplate.fromTemplate(`
  你是一名{role},擅长{skill}。
  请帮我完成以下任务:{task}
`)
```

### 模板类型

| Template 类型            | 用途           | 输出格式 |
| ------------------------ | -------------- | -------- |
| `PromptTemplate`         | 单轮文本提示词 | 字符串   |
| `ChatPromptTemplate`     | 多轮对话消息   | 消息数组 |
| `FewShotPromptTemplate`  | 少样本学习     | 字符串   |
| `PipelinePromptTemplate` | 模块化组合     | 字符串   |
| `MessagesPlaceholder`    | 动态消息占位   | 消息数组 |

## 使用示例

### 示例 1:PromptTemplate 基础用法

使用变量生成周报提示词:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 创建模板
const weeklyReportTemplate = PromptTemplate.fromTemplate(`
你是一名严谨但不失人情味的工程团队负责人,需要根据本周数据写一份周报。

公司名称:{company_name}
部门名称:{team_name}
直接汇报对象:{manager_name}
本周时间范围:{week_range}

本周团队核心目标:
{team_goal}

本周开发数据(Git 提交 / Jira 任务):
{dev_activities}

请根据以上信息生成一份【Markdown 周报】,要求:
- 有简短的整体 summary(两三句话)
- 有按模块/项目拆分的小结
- 用一个 Markdown 表格列出关键指标
- 语气专业但有一点人情味
`)

// 填充变量
const prompt = await weeklyReportTemplate.format({
  company_name: '星航科技',
  team_name: '数据智能平台组',
  manager_name: '刘总',
  week_range: '2025-03-10 ~ 2025-03-16',
  team_goal: '完成用户画像服务的灰度上线,并验证核心指标是否达标。',
  dev_activities:
    '- 阿兵:完成用户画像服务的 Canary 发布与回滚脚本优化,提交 27 次\n' +
    '- 小李:接入埋点数据,打通埋点 → Kafka → DWD → 画像服务的全链路,提交 22 次\n' +
    '- 小赵:完善画像服务的告警与Dashboard,新增 8 个告警规则,提交 15 次',
})

console.log('格式化后的提示词:')
console.log(prompt)

// 调用模型
const stream = await model.stream(prompt)
console.log('\nAI 回答:')
for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

运行:

```bash
node src/prompt-template1.mjs
```

### 示例 2:ChatPromptTemplate 聊天模板

生成多轮对话消息:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 创建聊天模板
const chatPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是一名资深工程团队负责人,擅长用结构化、易读的方式写技术周报。
写作风格要求:{tone}。

请根据后续用户提供的信息,帮他生成一份适合给老板和团队同时抄送的周报草稿。`,
  ],
  [
    'human',
    `本周信息如下:

公司名称:{company_name}
团队名称:{team_name}
直接汇报对象:{manager_name}
本周时间范围:{week_range}

本周团队核心目标:
{team_goal}

本周开发数据(Git 提交 / Jira 任务等):
{dev_activities}

请据此输出一份 Markdown 周报,结构建议包含:
1. 本周概览(2-3 句话)
2. 详细拆分(按项目或模块分段)
3. 关键指标表格

语气专业但有人情味。`,
  ],
])

// 填充变量生成消息
const chatMessages = await chatPrompt.formatMessages({
  tone: '专业、清晰、略带鼓励',
  company_name: '星航科技',
  team_name: '智能应用平台组',
  manager_name: '王总',
  week_range: '2025-05-05 ~ 2025-05-11',
  team_goal: '完成内部 AI 助手灰度上线,并确保核心链路稳定。',
  dev_activities: '- 小李:完成 AI 助手工单流转能力,对接客服系统,提交 25 次\n' + '- 小张:接入日志检索和知识库查询,提交 19 次\n' + '- 小王:完善监控、告警与埋点,新增 10 条核心告警规则',
})

console.log('ChatPromptTemplate 生成的消息:')
console.log(chatMessages)

// 调用模型
const response = await model.invoke(chatMessages)

console.log('\nAI 生成的周报草稿:')
console.log(response.content)
```

运行:

```bash
node src/chat-prompt-template.mjs
```

### 示例 3:Partial 部分填充

预填充部分变量,生成可复用的模板:

```typescript
import { PromptTemplate } from '@langchain/core/prompts'

// 创建完整模板
const template = PromptTemplate.fromTemplate(`
公司:{company_name}
部门:{team_name}
经理:{manager_name}
时间:{week_range}

本周目标:{team_goal}
本周活动:{dev_activities}
`)

// 预填充公司信息(部分填充)
const partialTemplate = await template.partial({
  company_name: '星航科技',
  company_values: '「极致、开放、靠谱」的价值观',
  tone: '偏正式但不僵硬',
})

// 后续只需填充剩余变量
const prompt1 = await partialTemplate.format({
  team_name: 'AI 平台组',
  manager_name: '刘东',
  week_range: '2025-02-10 ~ 2025-02-16',
  team_goal: '上线周报 Agent 到内部试用环境',
  dev_activities: '- 小明:完成 Git/Jira 集成封装\n- 小红:实现 Prompt 配置化加载',
})

const prompt2 = await partialTemplate.format({
  team_name: 'AI 工程效率组',
  manager_name: '王强',
  week_range: '2025-02-17 ~ 2025-02-23',
  team_goal: '打通 CI/CD 可观测链路',
  dev_activities: '- 阿俊:完成流水线执行数据的链路追踪接入',
})

console.log(prompt1)
console.log('\n================ 分割线 ================\n')
console.log(prompt2)
```

运行:

```bash
node src/partial.mjs
```

### 示例 4:PipelinePromptTemplate 模块化组合

将多个子模板组合成复杂 Prompt:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// A. 人设模块(可复用)
export const personaPrompt = PromptTemplate.fromTemplate(
  `你是一名资深工程团队负责人,写作风格:{tone}。
你擅长把枯燥的技术细节写得既专业又有温度。
`,
)

// B. 背景模块(可复用)
export const contextPrompt = PromptTemplate.fromTemplate(
  `公司:{company_name}
部门:{team_name}
直接汇报对象:{manager_name}
本周时间范围:{week_range}
本周部门核心目标:{team_goal}
`,
)

// C. 任务模块
const taskPrompt = PromptTemplate.fromTemplate(
  `以下是本周团队的开发活动(Git / Jira 汇总):
{dev_activities}

请你从这些原始数据中提炼出:
1. 本周整体成就亮点
2. 潜在风险和技术债
3. 下周重点计划建议
`,
)

// D. 格式模块
const formatPrompt = PromptTemplate.fromTemplate(
  `请用 Markdown 输出周报,结构包含:
1. 本周概览(2-3 句话的 Summary)
2. 详细拆分(按模块或项目分段)
3. 关键指标表格

注意:
- 尽量引用一些具体数据(如提交次数、任务编号)
- 语气专业,但可以偶尔带一点轻松的口吻,符合{company_values}。
`,
)

// E. 最终组合 Prompt
const finalWeeklyPrompt = PromptTemplate.fromTemplate(
  `{persona_block}
{context_block}
{task_block}
{format_block}

现在请生成本周的最终周报:`,
)

// 创建 Pipeline
export const pipelinePrompt = new PipelinePromptTemplate({
  pipelinePrompts: [
    { name: 'persona_block', prompt: personaPrompt },
    { name: 'context_block', prompt: contextPrompt },
    { name: 'task_block', prompt: taskPrompt },
    { name: 'format_block', prompt: formatPrompt },
  ],
  finalPrompt: finalWeeklyPrompt,
})

// 使用 Pipeline
const pipelineFormatted = await pipelinePrompt.format({
  tone: '专业、清晰、略带幽默',
  company_name: '星航科技',
  team_name: 'AI 平台组',
  manager_name: '刘东',
  week_range: '2025-02-10 ~ 2025-02-16',
  team_goal: '上线周报 Agent 到内部试用环境,并收集反馈。',
  dev_activities: '- 小明:完成 Git/Jira 集成封装\n' + '- 小红:实现 Prompt 配置化加载\n' + '- 小强:接入权限系统,支持按部门过滤数据',
  company_values: '「极致、开放、靠谱」的价值观',
})

console.log(pipelineFormatted)

// 调用模型
const response = await model.invoke(pipelineFormatted)
console.log('\nAI 生成的周报:')
console.log(response.content)
```

运行:

```bash
node src/pipeline-prompt-template.mjs
```

### 示例 5:FewShotPromptTemplate 少样本学习

通过示例教会模型输出格式:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 定义单条示例的模板
const examplePrompt = PromptTemplate.fromTemplate(
  `用户输入:{user_requirement}
期望周报结构:{expected_style}
模型示例输出片段:
{report_snippet}`,
)

// 准备示例数据
const examples = [
  {
    user_requirement: '重点突出稳定性治理,本周主要在修 Bug 和清理技术债,适合发给偏关注风险的老板。',
    expected_style: '语气稳健、偏保守,多强调风险识别和已做的兜底动作。',
    report_snippet:
      `- 支付链路本周共处理线上 P1 Bug 2 个、P2 Bug 3 个,全部在 SLA 内完成修复;\n` +
      `- 针对历史高频超时问题,完成 3 个核心接口的超时阈值和重试策略优化;\n` +
      `- 清理 12 条重复/噪音告警,减少值班同学 30% 的告警打扰。`,
  },
  {
    user_requirement: '偏向对外展示成果,希望多写一些亮点,适合发给更大范围的跨部门同学。',
    expected_style: '语气积极、突出成果,对技术细节做适度抽象。',
    report_snippet:
      `- 新上线「订单实时看板」,业务侧可以实时查看核心转化漏斗;\n` +
      `- 首次打通埋点 → 数据仓库 → 实时服务链路,为后续精细化运营提供基础能力;\n` +
      `- 和产品、运营一起完成 2 场内部分享,会后收到 15 条正向反馈。`,
  },
]

// 创建 FewShotPromptTemplate
const fewShotPrompt = new FewShotPromptTemplate({
  examples,
  examplePrompt,
  prefix: `下面是几条已经写好的【周报示例】,你可以从中学习语气、结构和信息组织方式:\n`,
  suffix: `\n基于上面的示例风格,请帮我写一份新的周报。`,
  inputVariables: [],
})

const fewShotBlock = await fewShotPrompt.format({})
console.log(fewShotBlock)

// 调用模型
const response = await model.invoke(fewShotBlock + '\n\n用户需求:本周完成了 AI 助手的灰度上线,既有技术突破也有业务价值。')
console.log('\nAI 输出:')
console.log(response.content)
```

运行:

```bash
node src/fewshot-prompt-template.mjs
```

### 示例 6:MessagesPlaceholder 动态消息占位

在聊天模板中插入历史对话:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 创建包含历史消息占位符的模板
const chatPromptWithHistory = ChatPromptTemplate.fromMessages([
  ['system', `你是一名资深工程效率顾问,善于在多轮对话的上下文中给出具体、可执行的建议。`],
  // 动态插入历史对话
  new MessagesPlaceholder('history'),
  [
    'human',
    `这是用户本轮的新问题:{current_input}

请结合上面的历史对话,一并给出你的建议。`,
  ],
])

// 构造历史对话
const historyMessages = [
  {
    role: 'human',
    content: '我们团队最近在做一个内部的周报自动生成工具。',
  },
  {
    role: 'ai',
    content: '听起来不错,可以先把数据源(Git / Jira / 运维)梳理清楚,再考虑 Prompt 模块化设计。',
  },
  {
    role: 'human',
    content: '我们已经把 Prompt 拆成了「人设」「背景」「任务」「格式」四块。',
  },
  {
    role: 'ai',
    content: '很好,接下来可以考虑把这些模块做成可复用的 PipelinePromptTemplate,方便在不同场景复用。',
  },
]

// 格式化消息
const formattedMessages = await chatPromptWithHistory.formatPromptValue({
  history: historyMessages,
  current_input: '现在我们想再优化一下多人协同编辑周报的流程,有什么建议?',
})

console.log('包含历史对话的消息数组:')
console.log(formattedMessages.toChatMessages())

// 调用模型
const aiReply = await model.invoke(formattedMessages)

console.log('\nAI 回复内容:')
console.log(aiReply.content)
```

运行:

```bash
node src/messages-placeholder.mjs
```

### 示例 7:LengthBasedExampleSelector 智能示例选择

根据输入长度自动选择合适数量的示例:

```typescript
import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { LengthBasedExampleSelector } from '@langchain/core/example_selectors'

const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
})

// 定义示例模板
const examplePrompt = PromptTemplate.fromTemplate(
  `用户需求:{user_requirement}
周报片段示例:
{report_snippet}
`,
)

// 准备不同长度的示例
const examples = [
  {
    user_requirement: '本周主要在做基础设施稳定性治理,想突出风险控制。',
    report_snippet: `- 核心链路共处理 P1 级别故障 1 起,P2 故障 2 起,均在 SLA 内完成处置;\n` + `- 对 5 个高风险接口补充了限流与熔断策略,覆盖 80% 高峰流量;`,
  },
  {
    user_requirement: '偏向对外展示成果,希望多写一些亮点。',
    report_snippet: `- 上线「实时订单看板」,业务侧可以实时查看核心转化漏斗;\n` + `- 打通埋点 → 数据仓库 → 实时服务链路。`,
  },
  {
    user_requirement: '只是想要一个非常简短的周报,两三句话就够了。',
    report_snippet: `本周整体运行平稳,未发生重大事故,核心指标均在预期范围内。`,
  },
]

// 创建智能选择器
const exampleSelector = await LengthBasedExampleSelector.fromExamples(examples, {
  examplePrompt,
  maxLength: 700, // 最大字符长度
  getTextLength: (text) => text.length,
})

// 创建 FewShotPromptTemplate
const fewShotPrompt = new FewShotPromptTemplate({
  examplePrompt,
  exampleSelector,
  prefix: '下面是一些不同风格和长度的周报片段示例:\n',
  suffix: '\n\n现在请根据上面的示例风格,为下面这个场景写周报:\n场景描述:{current_requirement}',
  inputVariables: ['current_requirement'],
})

// 生成 Prompt(选择器会自动选择合适数量的示例)
const finalPrompt = await fewShotPrompt.format({
  current_requirement: '我们本周在做「内部 AI 助手」项目,既有稳定性保障,也有新功能上线。',
})

console.log(finalPrompt)

// 调用模型
const stream = await model.stream(finalPrompt)
console.log('\n=== AI 输出 ===')
for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

运行:

```bash
node src/example-selector1.mjs
```

## 常见问题

### 1. 变量未填充

**问题**: 输出中仍有 `{variable_name}` 未被替换

**解决方案**:

- 检查 `format()` 传入的对象是否包含所有变量
- 使用 `template.inputVariables` 查看模板需要的变量列表
- 使用 `.partial()` 预填充部分变量

### 2. 特殊字符转义

**问题**: 变量值包含 `{` 或 `}` 字符导致解析错误

**解决方案**:

- 使用双大括号转义: <span v-pre>`{{` 和 `}}`</span>
- 或在模板中使用反斜杠进行转义: `\{` 和 `\}`

### 3. 模板过长

**问题**: PipelinePromptTemplate 组合后的 Prompt 超过 token 限制

**解决方案**:

- 减少不必要的模块
- 使用 `partial()` 预填充固定内容,减少动态部分
- 精简每个子模块的文本

### 4. 示例选择不合理

**问题**: LengthBasedExampleSelector 选择的示例与输入不相关

**解决方案**:

- 增加 `maxLength` 以包含更多示例
- 使用 `SemanticSimilarityExampleSelector` 基于语义相似度选择
- 手动筛选高质量示例

### 5. 多轮对话上下文丢失

**问题**: MessagesPlaceholder 插入的历史消息格式不正确

**解决方案**:

- 确保历史消息格式为 `{ role: 'human' | 'ai', content: string }`
- 使用 `toChatMessages()` 转换为模型接受的格式
- 检查消息顺序是否正确

## 注意事项

1. **变量命名**: 使用有意义的变量名(如 `user_name` 而非 `x1`),提高可读性

2. **模板复用**: 将通用模块(如人设、格式说明)提取为独立的 `PromptTemplate`,在多个场景复用

3. **Few-Shot 示例质量**: 示例应覆盖不同场景,数量建议 2-5 个,过多会增加 token 消耗

4. **Pipeline 模块化**: 将复杂 Prompt 拆分为独立模块,便于调试和维护

5. **调试技巧**: 使用 `console.log(template.format(vars))` 查看填充后的完整 Prompt

6. **性能优化**: 对于不变的模板,在初始化时创建一次,避免重复调用 `fromTemplate()`

## 相关资源

- [LangChain.js 官方文档 - Prompts](https://js.langchain.com/docs/modules/model_io/prompts/)
- [Prompt Template 最佳实践](https://js.langchain.com/docs/guides/prompting)
- [Few-Shot Learning 指南](https://js.langchain.com/docs/modules/model_io/prompts/few_shot_examples)
