import { Injectable, InternalServerErrorException } from '@nestjs/common';

interface ParsedBudget {
  items: any[];
  totalValue: number;
  totalItems: number;
  requestedBy?: string;
  contractor?: string;
  storeName?: string;
  deliveryMan?: string;
}

@Injectable()
export class AiService {
  async parseBudget(text: string): Promise<ParsedBudget> {
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
                content: `Você é um robô extrator de dados JSON para construção civil.
                
                REGRAS DE OURO:
                1. Responda APENAS com o objeto JSON. 
                2. Não escreva "Aqui está o json" ou "Com certeza".
                3. Não use blocos de código markdown (sem crases).
                
                ESTRUTURA OBRIGATÓRIA:
                {
                    "items": [{"product": string, "quantity": number, "price": number, "category": string}],
                    "requestedBy": string,
                    "contractor": string,
                    "storeName": string,
                    "deliveryMan": string
                }

                Categorias: "Alvenaria", "Elétrica", "Hidráulica", "Pintura", "Acabamento", "Ferramentas" ou "Outros".`,
              },
              {
                role: 'user',
                content: `Texto do orçamento: "${text}"`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Erro na IA');

      let content = data.choices[0].message.content;
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}') + 1;

      if (jsonStartIndex === -1 || jsonEndIndex === 0) {
        throw new Error('A IA não retornou um JSON válido');
      }

      content = content.substring(jsonStartIndex, jsonEndIndex);

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

      return {
        items,
        totalValue: items.reduce((acc, item) => acc + item.subtotal, 0),
        totalItems: items.length,
        requestedBy: parsed.requestedBy || null,
        contractor: parsed.contractor || null,
        storeName: parsed.storeName || null,
        deliveryMan: parsed.deliveryMan || null,
      };
    } catch (error) {
      console.error('Erro detalhado no AiService:', error.message);
      throw new InternalServerErrorException(
        'Falha ao ler o orçamento. Certifique-se que o texto contém dados claros.',
      );
    }
  }
}
