import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface ParsedBudget {
  items: any[];
  totalValue: number;
  totalItems: number;
  totalEconomy: number;
  requestedBy?: string;
  contractor?: string;
  storeName?: string;
  deliveryMan?: string;
  applicationNotes?: string;
  financialImpactNotes?: string;
  stops?: Array<{ storeName: string; itemsCount: number }>;
  logisticsInfo?: {
    startKm?: number;
    endKm?: number;
    departureTime?: string;
    arrivalTime?: string;
    deliveryStatus?: string;
    deliveryAnalysis?: 'BARATO' | 'NA MÉDIA' | 'CARO';
  };
}

@Injectable()
export class AiService {
  async parseBudget(text: string): Promise<ParsedBudget> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      throw new InternalServerErrorException('GROQ_API_KEY ausente.');

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
                content: `Você é um Engenheiro de Custos Sênior. Extraia dados técnicos de obras.
              Retorne APENAS JSON puro com esta estrutura:
              {
                "items": [{"product": string, "brand": string, "quantity": number, "price": number, "store": string, "status": "BARATO"|"NA MÉDIA"|"CARO", "variation": string}],
                "logistics": {"startKm": number, "endKm": number, "departureTime": string, "arrivalTime": string, "deliveryStatus": string, "deliveryAnalysis": string},
                "totalEconomy": number,
                "applicationNotes": string,
                "financialImpactNotes": string,
                "requestedBy": string, "contractor": string, "deliveryMan": string,
                "stops": [{"storeName": string, "itemsCount": number}]
              }`,
              },
              { role: 'user', content: `Texto: "${text}"` },
            ],
            response_format: { type: 'json_object' },
            temperature: 0,
          }),
        },
      );

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      const items = (parsed.items || []).map((item: any) => ({
        ...item,
        product: String(item.product).toUpperCase().trim(),
        brand: item.brand || 'N/A',
        store: item.store || 'Geral',
        subtotal: (Number(item.quantity) || 0) * (Number(item.price) || 0),
        variation: item.variation || '0%',
      }));

      return {
        items,
        totalValue: items.reduce((acc, i) => acc + i.subtotal, 0),
        totalItems: items.length,
        totalEconomy: Number(parsed.totalEconomy) || 0,
        requestedBy: parsed.requestedBy || 'Sebastião',
        contractor: parsed.contractor || 'Wilson',
        deliveryMan: parsed.deliveryMan || 'Marcos',
        applicationNotes: parsed.applicationNotes || 'N/A',
        financialImpactNotes:
          parsed.financialImpactNotes || 'Análise de mercado realizada.',
        stops: parsed.stops || [],
        logisticsInfo: {
          ...parsed.logistics,
          deliveryAnalysis: parsed.logistics?.deliveryAnalysis || 'NA MÉDIA',
          deliveryStatus: parsed.logistics?.deliveryStatus || 'CONCLUÍDO',
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('Erro no processamento da IA.');
    }
  }
}
