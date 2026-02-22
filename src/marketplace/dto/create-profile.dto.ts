import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfileDto {
  @ApiProperty({ example: 'Marcos Pinturas' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['professional', 'store', 'driver'] })
  @IsIn(['professional', 'store', 'driver'])
  type: string;

  @ApiProperty({ example: 'Pintura', required: false })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({ example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  pricePerUnit?: number;

  @ApiProperty({ example: 'm2', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  lng: number;

  @ApiProperty({ example: 'Centro, SP' })
  @IsString()
  address: string;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ isArray: true, required: false })
  @IsOptional()
  @IsArray()
  offers?: any[];
}
