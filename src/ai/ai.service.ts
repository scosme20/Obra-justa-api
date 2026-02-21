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
                content: `Você é um especialista em suprimentos de construção civil. 
                Sua tarefa é extrair itens de textos de orçamentos.
                
                REGRAS CRÍTICAS:
                1. Retorne APENAS um JSON puro.
                2. Estrutura: {"items": [{"product": string, "quantity": number, "price": number, "category": string}]}.
                3. Categorias permitidas: "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Acabamento", "Ferramentas" ou "Outros".
                4. Se não houver preço, use 0. Se não houver quantidade, use 1.
                5. Normalize o nome do produto: minúsculo, sem acentos e sem a marca (coloque a marca se houver no nome do produto).`,
              },
              {
                role: 'user',
                content: `Extraia os itens deste texto: "${text}"`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1, 
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Erro na comunicação com a IA');
      }

      const content = data.choices[0].message.content;
      const parsed = JSON.parse(content);

      const items = (parsed.items || []).map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const prc = Number(item.price) || 0;

        return {
          product: String(item.product).toLowerCase().trim(),
          quantity: qty,
          price: prc,
          category: item.category || 'Outros',
          subtotal: qty * prc,
        };
      });

      const totalValue = items.reduce((acc, item) => acc + item.subtotal, 0);

      return {
        items,
        totalValue,
        totalItems: items.length,
      };
    } catch (error) {
      console.error('Falha no AiService:', error.message);
      throw new InternalServerErrorException(
        'Erro ao processar a inteligência do orçamento. Verifique o log do servidor.',
      );
    }
  }
}
