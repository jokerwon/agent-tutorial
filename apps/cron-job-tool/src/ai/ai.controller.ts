import { from, map } from 'rxjs';
import { Controller, Get, Logger, Query, Sse } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query);
    return { answer };
  }

  @Sse('chat/stream')
  chatStream(@Query('query') query: string) {
    this.logger.log(query);

    const stream = this.aiService.runChainStream(query);

    return from(stream).pipe(
      map((chunk) => ({
        data: chunk,
      })),
    );
  }
}
