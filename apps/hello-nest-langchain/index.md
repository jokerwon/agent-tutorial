---
title: NestJS + LangChain 集成指南
description: 介绍如何在 NestJS 框架中集成 LangChain.js 实现同步和流式 AI 对话
---

# NestJS + LangChain 集成指南

## 简介

本项目演示如何在 NestJS 框架中集成 LangChain.js,构建生产级的 AI 服务。通过 NestJS 的模块化架构和依赖注入机制,将 LangChain 的 Chat 模型、Prompt 模板和 Runnable 链封装为可复用的 Service,提供同步调用和 SSE(Server-Sent Events)流式输出两种 API 接口,适合构建 Web 应用和实时��话系统。

## 环境配置

### 安装依赖

```bash
cd apps/hello-nest-langchain
pnpm install
```

### 配置环境变量

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
推荐使用 `qwen-plus` 或 `gpt-4` 等能力较强的模型。确保 `OPENAI_BASE_URL` 与你使用的 API 服务相匹配。
:::

## 核心概念

### NestJS 模块化架构

NestJS 使用模块(Module)、控制器(Controller)和服务(Service)的三层架构:

- **Module**: 组织相关功能的容器,管理依赖注入
- **Controller**: 处理 HTTP 请求,定义 API 路由
- **Service**: 封装业务逻辑,可被多个 Controller 复用

### LangChain 集成模式

在 NestJS 中集成 LangChain 的最佳实践:

1. **Provider 封装**: 将 ChatOpenAI 作为 Provider 注入到 Module
2. **Service 层**: 使用 Runnable 链封装 LangChain 逻辑
3. **Controller 层**: 暴露 RESTful API 和 SSE 流式接口

### SSE(Server-Sent Events)

SSE 是一种服务器推送技术,适合实时流式输出:

- 客户端通过 `EventSource` 建立长连接
- 服务器持续推送数据块
- 比 WebSocket 更轻量,适合单向数据流

## 项目结构

```
apps/hello-nest-langchain/
├── src/
│   ├── ai/                      # AI 模块
│   │   ├── ai.module.ts         # AI Module 定义
│   │   ├── ai.controller.ts     # AI Controller (路由)
│   │   └── ai.service.ts        # AI Service (业务逻辑)
│   ├── app.module.ts            # 根模块
│   ├── app.controller.ts        # 根控制器
│   └── main.ts                  # 应用入口
├── public/
│   └── sse-test.html            # SSE 测试页面
├── .env                         # 环境变量
└── package.json
```

## 核心代码解析

### 1. AI Module - 模块定义

`src/ai/ai.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ChatOpenAI } from '@langchain/openai';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'CHAT_MODEL', // 注入令牌
      useFactory(configService: ConfigService) {
        return new ChatOpenAI({
          modelName: configService.get<string>('MODEL_NAME'),
          temperature: 0.7,
          apiKey: configService.get<string>('OPENAI_API_KEY'),
          configuration: {
            baseURL: configService.get<string>('OPENAI_BASE_URL'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
```

**关键点**:
- 使用 `useFactory` 动态创建 `ChatOpenAI` 实例
- 通过 `ConfigService` 读取环境变量
- 使用注入令牌 `'CHAT_MODEL'` 便于测试和替换

### 2. AI Service - 业务逻辑

`src/ai/ai.service.ts`:

```typescript
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { Runnable } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly chain: Runnable<{ query: string }, string>;

  constructor(@Inject('CHAT_MODEL') model: ChatOpenAI) {
    // 构建 Runnable 链
    const prompt = PromptTemplate.fromTemplate('请回答以下问题:\n\n{query}');
    this.chain = prompt
      .pipe(model)
      .pipe(new StringOutputParser());
  }

  // 同步调用
  async runChain(query: string): Promise<string> {
    return this.chain.invoke({ query });
  }

  // 流式调用
  async *streamChain(query: string): AsyncGenerator<string> {
    const stream = await this.chain.stream({ query });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
```

**关键点**:
- 在构造函数中构建 Runnable 链,避免重复创建
- `runChain` 返回完整结果
- `streamChain` 使用 AsyncGenerator 实现流式输出

### 3. AI Controller - 路由定义

`src/ai/ai.controller.ts`:

```typescript
import { Controller, Get, Query, Sse } from '@nestjs/common';
import { from, map } from 'rxjs';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 同步接口
  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);
    return { answer };
  }

  // 流式接口(SSE)
  @Sse('chat/stream')
  chatStream(@Query('query') query: string) {
    return from(this.aiService.streamChain(query)).pipe(
      map((chunk) => ({ data: chunk })),
    );
  }
}
```

**关键点**:
- `@Get('chat')` 定义同步接口,返回完整结果
- `@Sse('chat/stream')` 定义 SSE 流式接口
- 使用 RxJS 的 `from` 和 `map` 将 AsyncGenerator 转换为 Observable

### 4. App Module - 根模块

`src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';

@Module({
  imports: [
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**关键点**:
- `ConfigModule.forRoot()` 全局加载环境变量
- `ServeStaticModule` 提供静态文件服务(用于测试页面)

## 使用示例

### 启动服务

```bash
# 开发模式(热重载)
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

服务将在 `http://localhost:3000` 启动。

### 示例 1:同步对话接口

#### 使用 cURL

```bash
curl "http://localhost:3000/ai/chat?query=什么是LangChain?"
```

响应:

```json
{
  "answer": "LangChain 是一个用于构建 AI 应用程序的开源框架..."
}
```

#### 使用 JavaScript

```javascript
const response = await fetch('http://localhost:3000/ai/chat?query=什么是LangChain?')
const data = await response.json()
console.log(data.answer)
```

### 示例 2:流式对话接口(SSE)

#### 前端代码

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>SSE 流式接口测试</title>
  </head>
  <body>
    <h1>SSE 流式接口测试</h1>
    <input type="text" id="query" value="什么是 LangChain?" />
    <button id="btn">开始流式请求</button>
    <div id="output"></div>

    <script>
      const queryInput = document.getElementById('query')
      const btn = document.getElementById('btn')
      const output = document.getElementById('output')

      btn.addEventListener('click', () => {
        const q = queryInput.value.trim()
        if (!q) return

        const url = `http://localhost:3000/ai/chat/stream?query=${encodeURIComponent(q)}`
        output.textContent = ''
        btn.disabled = true

        // 创建 EventSource 连接
        const eventSource = new EventSource(url)

        // 接收消息
        eventSource.onmessage = ({ data }) => {
          output.textContent += data
        }

        // 连接结束
        eventSource.onerror = () => {
          eventSource.close()
          btn.disabled = false
        }
      })
    </script>
  </body>
</html>
```

#### 使用测试页面

访问 `http://localhost:3000/sse-test.html`,输入问题并点击"开始流式请求"。

### 示例 3:扩展为 RAG 应用

在 `ai.service.ts` 中集成 RAG:

```typescript
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MilvusClient, MetricType } from '@zilliz/milvus2-sdk-node';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly chain: RunnableSequence;
  private readonly milvusClient: MilvusClient;
  private readonly embeddings: OpenAIEmbeddings;

  constructor(@Inject('CHAT_MODEL') model: ChatOpenAI) {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.EMBEDDINGS_MODEL_NAME,
    });

    this.milvusClient = new MilvusClient({
      address: 'localhost:19530',
    });

    const prompt = PromptTemplate.fromTemplate(
      `基于以下内容回答问题:

{context}

用户问题: {query}

回答:`,
    );

    // 构建 RAG 链
    this.chain = RunnableSequence.from([
      RunnableLambda.from(this.retrieve.bind(this)),
      prompt,
      model,
      new StringOutputParser(),
    ]);
  }

  // 从 Milvus 检索相关内容
  private async retrieve(input: { query: string }) {
    const queryVector = await this.embeddings.embedQuery(input.query);

    const searchResult = await this.milvusClient.search({
      collection_name: 'documents',
      vector: queryVector,
      limit: 3,
      metric_type: MetricType.COSINE,
      output_fields: ['content'],
    });

    const context = searchResult.results
      .map((item) => item.content)
      .join('\n\n');

    return { query: input.query, context };
  }

  async runChain(query: string): Promise<string> {
    return this.chain.invoke({ query });
  }

  async *streamChain(query: string): AsyncGenerator<string> {
    const stream = await this.chain.stream({ query });
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
```

## API 接口文档

### GET /ai/chat

同步对话接口

**请求参数**:

- `query` (string, required): 用户问题

**响应**:

```json
{
  "answer": "AI 的回答内容"
}
```

**示例**:

```bash
GET /ai/chat?query=什么是LangChain?
```

### GET /ai/chat/stream

流式对话接口(SSE)

**请求参数**:

- `query` (string, required): 用户问题

**响应**:

Server-Sent Events 流,每个事件包含一个文本片段

**示例**:

```javascript
const eventSource = new EventSource('/ai/chat/stream?query=什么是LangChain?')
eventSource.onmessage = ({ data }) => {
  console.log(data) // 逐字输出
}
```

## 常见问题

### 1. 环境变量未加载

**问题**: 报错 `OPENAI_API_KEY is not defined`

**解决方案**:
- 确保 `.env` 文件位于项目根目录
- 检查 `ConfigModule.forRoot()` 是否正确配置
- 重启服务以重新加载环境变量

### 2. SSE 连接立即断开

**问题**: EventSource 连接建立后立即关闭

**解决方案**:
- 检查 `streamChain()` 是否正确 yield 数据
- 确保没有在 generator 中提前 return
- 使用 `from()` 将 AsyncGenerator 转换为 RxJS Observable

### 3. 跨域问题(CORS)

**问题**: 前端调用 API 时报跨域错误

**解决方案**:

在 `main.ts` 中启用 CORS:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用 CORS
  app.enableCors({
    origin: 'http://localhost:5173', // 前端地址
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
```

### 4. 流式输出中文乱码

**问题**: SSE 输出的中文显示为乱码

**解决方案**:
- 确保响应头包含 `Content-Type: text/event-stream; charset=utf-8`
- 检查 `StringOutputParser` 是否正确处理 UTF-8 编码

### 5. 依赖注入失败

**问题**: 报错 `Cannot resolve dependency 'CHAT_MODEL'`

**解决方案**:
- 检查 `@Inject('CHAT_MODEL')` 是否与 `provide: 'CHAT_MODEL'` 一致
- 确保 `AiModule` 已正确导入到 `AppModule`

## 注意事项

1. **生产环境安全**:
   - 不要将 `.env` 文件提交到 Git
   - 使用环境变量或密钥管理服务存储 API Key
   - 添加 API 请求速率限制

2. **性能优化**:
   - 在 Service 构造函数中创建 Runnable 链,避免重复初始化
   - 使用连接池管理数据库连接(Milvus、Redis 等)
   - 考虑使用 Redis 缓存频繁请求的结果

3. **错误处理**:
   - 使用 NestJS 的异常过滤器统一处理错误
   - 在 SSE 连接中添加超时机制
   - 记录 API 调用日志便于排查问题

4. **测试**:
   - 使用 `@nestjs/testing` 编写单元测试
   - Mock ChatOpenAI 避免真实 API 调用
   - 测试 SSE 流式接口的完整流程

5. **扩展性**:
   - 将 AI 模块拆分为多个子模块(如 Chat、RAG、Agent)
   - 使用自定义 Provider 支持多个 LLM 模型
   - 考虑使用消息队列处理长时间运行的任务

## 相关资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [LangChain.js 官方文档](https://js.langchain.com/)
- [Server-Sent Events 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [RxJS 官方文档](https://rxjs.dev/)
