import { Injectable } from '@nestjs/common';
import { Tool, tool } from '@langchain/core/tools';

@Injectable()
export class TimeNowToolService {
  readonly tool: Tool<{ iso: string; timestamp: number }>;

  constructor() {
    this.tool = tool(
      () => {
        const now = new Date();
        return {
          iso: now.toISOString(),
          timestamp: now.getTime(),
        };
      },
      {
        name: 'time_now',
        description:
          '获取当前服务器时间，返回 ISO 字符串（iso）和毫秒级时间戳（timestamp）。',
      },
    );
  }
}
