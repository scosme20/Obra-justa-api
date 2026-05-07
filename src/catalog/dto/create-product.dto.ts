import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cimento CP-II 50kg' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Alvenaria' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'saco' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 32.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'Votorantim', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ enum: ['low', 'medium', 'high'], required: false })
  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  demandLevel?: string;
}
