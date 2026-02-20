import { Injectable, InternalServerErrorException } from '@nestjs/common';
@Injectable()
export class AiService {
  async parseBudget(text: string) {
    // Buscando a chave do arquivo .env
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Configuração de API ausente (GROQ_API_KEY).',
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
                content:
                  'Você é um extrator de dados de construção. Retorne APENAS um objeto JSON com a chave "items". Cada item deve ter: product, quantity, price.',
              },
              {
                role: 'user',
                content: `Converta este texto em JSON: "${text}"`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, // Mantém a resposta estável e técnica
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na Groq:', data);
        throw new Error(data.error?.message || 'Erro na comunicação com a IA');
      }

      // A resposta da Groq vem em data.choices[0].message.content como string
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Falha no ParseBudget:', error.message);
      throw new InternalServerErrorException(
        'Não foi possível processar o orçamento.',
      );
    }
  }
}
