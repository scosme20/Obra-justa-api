import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('parse-budget')
  async parse(@Body('text') text: string) {
    const result = await this.aiService.parseBudget(text);
    return result;
  }
}
