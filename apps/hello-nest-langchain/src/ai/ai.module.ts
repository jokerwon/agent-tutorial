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
      provide: 'CHAT_MODEL',
      useFactory(configService: ConfigService) {
        return new ChatOpenAI({
          modelName: configService.get<string>('OPENAI_MODEL', 'gpt-3.5-turbo'),
          temperature: 0.7,
          apiKey: configService.get<string>('OPENAI_API_KEY'),
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class AiModule {}
