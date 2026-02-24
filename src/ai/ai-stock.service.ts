import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { ScheduleService } from '../schedule/schedule.service';
import Groq from 'groq-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiStockService {
  private groq: Groq;

  constructor(
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService,

    @Inject(forwardRef(() => ScheduleService))
    private scheduleService: ScheduleService,

    private configService: ConfigService,
  ) {
    this.groq = new Groq({ apiKey: this.configService.get('GROQ_API_KEY') });
  }

  async analyzeStockHealth(userId: string) {
    const stock = await this.inventoryService.getWorkStock(userId);
    const schedule = await this.scheduleService.getMySchedule(userId);

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Você é um Engenheiro de Suprimentos experiente da plataforma "Obra Justa". 
          Analise o estoque e o cronograma da obra e forneça insights práticos.
          
          Regras de análise:
          1. Identifique materiais em falta para as tarefas dos próximos 15 dias.
          2. Alerte sobre materiais com risco de desperdício ou validade.
          3. Sugira organização baseada no volume de itens.
          
          Retorne estritamente em JSON: 
          {"alerts": [{"type": "danger"|"warning"|"info", "message": string, "action": string}]}`,
        },
        {
          role: 'user',
          content: `Estoque Atual: ${JSON.stringify(stock)} 
                    Cronograma: ${JSON.stringify(schedule)}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    try {
      return JSON.parse(content || '{"alerts": []}');
    } catch (e) {
      return {
        alerts: [
          {
            type: 'info',
            message:
              'Análise concluída, mas o formato de resposta precisa de ajuste.',
            action: 'Tente atualizar a página',
          },
        ],
      };
    }
  }
}
