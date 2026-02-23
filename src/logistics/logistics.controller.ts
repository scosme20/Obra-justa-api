import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { CreateFreightDto } from './dto/create-freight.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logistics')
@UseGuards(JwtAuthGuard)
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Post('request')
  async requestFreight(@Request() req, @Body() dto: CreateFreightDto) {
    return this.logisticsService.requestFreight(req.user.userId, dto);
  }

  @Get('available')
  async getAvailable(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.logisticsService.getAvailableFreights(Number(lat), Number(lng));
  }

  @Patch('accept/:id')
  async acceptFreight(@Request() req, @Param('id') id: string) {
    return this.logisticsService.acceptFreight(req.user.userId, id);
  }

  @Patch('finish/:id')
  async finishDelivery(@Param('id') id: string) {
    return this.logisticsService.finishDelivery(id);
  }
}
