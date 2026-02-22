import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CreateCostDto } from './dto/create-cost.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post('profile')
  @ApiOperation({ summary: 'Cadastrar parceiro (Profissional ou Loja)' })
  async create(@Body() createProfileDto: CreateProfileDto) {
    return await this.marketplaceService.createProfile(createProfileDto);
  }

  @Get('profiles/:type')
  @ApiOperation({ summary: 'Listar perfis por tipo' })
  @ApiParam({ name: 'type', enum: ['driver', 'professional', 'store'] })
  async getByType(@Param('type') type: string) {
    return await this.marketplaceService.getProfilesByType(type);
  }

  @Get('match')
  @ApiOperation({ summary: 'Match de profissionais: Preço + Distância + IA' })
  async findMatch(
    @Query('specialty') s: string,
    @Query('amount') a: number,
    @Query('unit') u: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return await this.marketplaceService.getProfessionalMatch(
      s,
      a,
      u,
      lat,
      lng,
    );
  }

  @Get('offers')
  @ApiOperation({ summary: 'Ver ofertas de lojas (ordenadas por proximidade)' })
  @ApiQuery({ name: 'category', required: false })
  async getOffers(
    @Query('category') c?: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    return await this.marketplaceService.getStoreOffers(c, lat, lng);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('finance/cost')
  @ApiOperation({ summary: 'Registrar um novo gasto (O ID vem do Token)' })
  async addCost(@Request() req, @Body() createCostDto: CreateCostDto) {
    return await this.marketplaceService.addConstructionCost(
      req.user.userId,
      createCostDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('finance/summary/:userId')
  @ApiOperation({ summary: 'Ver resumo financeiro (Apenas o próprio dono)' })
  async getFinanceSummary(@Param('userId') userId: string, @Request() req) {
    if (userId !== req.user.userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar os dados desta obra.',
      );
    }
    return await this.marketplaceService.getFinancialSummary(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('finance/ai-advice/:userId')
  @ApiOperation({ summary: 'Conselho da IA (Apenas o próprio dono)' })
  async getFinanceAiAdvice(@Param('userId') userId: string, @Request() req) {
    if (userId !== req.user.userId) {
      throw new ForbiddenException('Acesso negado.');
    }
    return await this.marketplaceService.getAiFinanceAdvice(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('favorites')
  @ApiOperation({ summary: 'Salvar profissional nos favoritos' })
  async addFav(@Request() req, @Body() b: { profileId: string }) {
    return await this.marketplaceService.saveToFavorites(
      req.user.userId,
      b.profileId,
    );
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('favorites')
  @ApiOperation({ summary: 'Remover dos favoritos' })
  async delFav(@Request() req, @Query('profileId') p: string) {
    return await this.marketplaceService.removeFavorite(req.user.userId, p);
  }
}
