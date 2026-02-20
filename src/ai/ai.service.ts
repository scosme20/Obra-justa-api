import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class AiService {
  async parseBudget(text: string) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Configuração de API ausente (GROQ_API_KEY no .env).',
      );
    }

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',

        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${apiKey}`,

            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',

            messages: [
              {
                role: 'system',
                content: `Você é um extrator de dados de construção. 
  Instruções:
  1. Retorne APENAS um objeto JSON.
  2. Use SEMPRE a chave "items".
  3. Se não encontrar quantidade ou preço, use 1 e 0 como padrão.
  4. Exemplo de saída: {"items": [{"product": "cimento", "quantity": 10, "price": 35.50}]}`,
              },

              {
                role: 'user',

                content: `Converta este texto em JSON: "${text}"`,
              },
            ],

            response_format: { type: 'json_object' },

            temperature: 0.1,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na Groq:', data);

        throw new Error(data.error?.message || 'Erro na comunicação com a IA');
      }

      const content = data.choices[0].message.content;

      const cleanJson = content.replace(/```json|```/g, '').trim();

      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Falha no AiService:', error.message);

      throw new InternalServerErrorException(
        'Não foi possível processar o orçamento. Verifique o console.',
      );
    }
  }
}
