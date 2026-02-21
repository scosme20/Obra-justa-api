import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Delete,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('profile')
  @ApiOperation({
    summary: 'Cadastrar parceiro (Inclua lat/lng para geolocalização)',
  })
  async create(@Body() body: any) {
    return await this.marketplaceService.createProfile(body);
  }

  @Get('profiles/:type')
  @ApiOperation({ summary: 'Listar por tipo' })
  @ApiParam({ name: 'type', enum: ['driver', 'professional', 'store'] })
  async getByType(@Param('type') type: string) {
    return await this.marketplaceService.getProfilesByType(type);
  }

  @Get('match')
  @ApiOperation({
    summary: 'Match de profissionais: Preço + Distância + Consultoria IA',
  })
  async findMatch(
    @Query('specialty') s: string,
    @Query('amount') a: number,
    @Query('unit') u: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return await this.marketplaceService.getProfessionalMatch(
      s,
      Number(a),
      u,
      Number(lat),
      Number(lng),
    );
  }

  @Post('finance/cost')
  @ApiOperation({ summary: 'Dono da Obra: Registrar um novo gasto/custo' })
  async addCost(
    @Query('userId') userId: string,
    @Body()
    body: {
      description: string;
      category: string;
      plannedValue: number;
      actualValue: number;
    },
  ) {
    return await this.marketplaceService.addConstructionCost(userId, body);
  }

  @Get('finance/summary/:userId')
  @ApiOperation({ summary: 'Ver resumo financeiro e Health Score da obra' })
  async getFinanceSummary(@Param('userId') userId: string) {
    return await this.marketplaceService.getFinancialSummary(userId);
  }

  @Get('finance/ai-advice/:userId')
  @ApiOperation({
    summary: 'Consultoria de IA sobre a saúde financeira da obra',
  })
  async getFinanceAiAdvice(@Param('userId') userId: string) {
    return await this.marketplaceService.getAiFinanceAdvice(userId);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Ver ofertas de lojas (ordenadas por proximidade)' })
  async getOffers(
    @Query('category') c?: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return await this.marketplaceService.getStoreOffers(
      c,
      Number(lat),
      Number(lng),
    );
  }

  @Post('favorites')
  @ApiOperation({ summary: 'Salvar profissional nos favoritos' })
  async addFav(@Body() b: { userId: string; profileId: string }) {
    return await this.marketplaceService.saveToFavorites(b.userId, b.profileId);
  }

  @Post('review')
  @ApiOperation({ summary: 'Avaliar um profissional/serviço' })
  async review(
    @Body()
    b: {
      profileId: string;
      userId: string;
      rating: number;
      comment: string;
    },
  ) {
    return await this.marketplaceService.addReview(
      b.profileId,
      b.userId,
      b.rating,
      b.comment,
    );
  }

  @Delete('favorites')
  @ApiOperation({ summary: 'Remover dos favoritos' })
  async delFav(@Query('userId') u: string, @Query('profileId') p: string) {
    return await this.marketplaceService.removeFavorite(u, p);
  }
}
