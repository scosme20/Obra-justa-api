import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min } from 'class-validator';

export class ConsumeStockDto {
  @ApiProperty({
    example: 'cimento',
    description: 'Nome do produto no estoque',
  })
  @IsString() // Adicione isso
  product: string;

  @ApiProperty({ example: 5, description: 'Quantidade a ser subtraída' })
  @IsNumber() // Adicione isso
  @Min(1) // Opcional: evita consumo de valores negativos ou zero
  quantity: number;
}

export class CreateBudgetDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  requestedBy: string;

  @ApiProperty({ example: 'Mestre Wilson' })
  @IsString()
  contractor: string;

  @ApiProperty({ example: 'Loja Construir' })
  @IsString()
  storeName: string;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray() // Adicione isso
  items: any[];
}
