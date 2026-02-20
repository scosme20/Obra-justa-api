import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ParseBudgetDto {
  @IsString({ message: 'O userId deve ser uma string' })
  @IsNotEmpty({ message: 'O userId é obrigatório' })
  userId: string;

  @IsString({ message: 'O texto deve ser uma string' })
  @IsNotEmpty({ message: 'O texto do orçamento não pode estar vazio' })
  @MinLength(5, { message: 'Mande um texto um pouco mais detalhado' })
  text: string;
}
