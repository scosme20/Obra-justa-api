import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { MasterProduct } from './interfaces/product.interface';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('product')
  async addProduct(@Body() product: MasterProduct) {
    return this.catalogService.createProduct(product);
  }

  @Get('products')
  async getProducts(@Query('category') category?: string) {
    if (category) {
      return this.catalogService.findByCategory(category);
    }
    return this.catalogService.findAll();
  }
}
