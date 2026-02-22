import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCostDto {
  @ApiProperty({ example: 'Piso Porcelanato' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Material' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 2000 })
  @IsNumber()
  plannedValue: number;

  @ApiProperty({ example: 2150 })
  @IsNumber()
  actualValue: number;
}
