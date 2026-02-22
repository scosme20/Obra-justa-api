import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsISO8601,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Fundação e Baldrame' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Escavação e concretagem das sapatas' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsISO8601()
  startDate: string;

  @ApiProperty({ example: '2026-03-15' })
  @IsISO8601()
  endDate: string;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'IN_PROGRESS', 'DONE'] })
  @IsEnum(['PENDING', 'IN_PROGRESS', 'DONE'])
  @IsOptional()
  status?: string;
}
