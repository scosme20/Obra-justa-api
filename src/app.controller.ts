import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'up',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
