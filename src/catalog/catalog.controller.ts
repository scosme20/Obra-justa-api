import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('product')
  @ApiOperation({
    summary: 'Cadastra produto no catálogo master (requer autenticação)',
  })
  async addProduct(@Body() product: CreateProductDto) {
    return this.catalogService.createProduct(product);
  }

  @Get('products')
  @ApiOperation({
    summary: 'Lista produtos do catálogo, opcionalmente por categoria',
  })
  async getProducts(@Query('category') category?: string) {
    if (category) return this.catalogService.findByCategory(category);
    return this.catalogService.findAll();
  }
}
