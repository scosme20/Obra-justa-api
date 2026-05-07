import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CoordsDto {
  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  lng: number;
}

export class CreateFreightDto {
  @ApiProperty({ type: CoordsDto })
  @ValidateNested()
  @Type(() => CoordsDto)
  originCoords: CoordsDto;

  @ApiProperty({ type: CoordsDto })
  @ValidateNested()
  @Type(() => CoordsDto)
  destinationCoords: CoordsDto;

  @ApiProperty({ example: 120.5 })
  @IsNumber()
  totalWeight: number;

  @ApiProperty({ required: false, example: 'budget-abc123' })
  @IsOptional()
  @IsString()
  budgetId?: string;
}
