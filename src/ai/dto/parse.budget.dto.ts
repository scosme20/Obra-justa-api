import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParseBudgetDto {
  @ApiProperty({
    description: 'ID do usuário proprietário do orçamento',
    example: 'user_12345',
  })
  @IsString({ message: 'O userId deve ser uma string' })
  @IsNotEmpty({ message: 'O userId é obrigatório' })
  userId: string;

  @ApiProperty({
    description: 'Texto bruto extraído de mensagens, fotos ou documentos',
    example:
      '20 sacos de cimento por 32.90 cada e 50 metros de cabo flexível por 4.50 o metro',
    minLength: 5,
  })
  @IsString({ message: 'O texto deve ser uma string' })
  @IsNotEmpty({ message: 'O texto do orçamento não pode estar vazio' })
  @MinLength(5, { message: 'Mande um texto um pouco mais detalhado' })
  text: string;
}
