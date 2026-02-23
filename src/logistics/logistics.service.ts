import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../config/firebase.config';
import { InventoryService } from '../inventory/inventory.service';
import { ScheduleService } from '../schedule/schedule.service';
import { FinanceService } from '../finance/finance.service';
import { CreateFreightDto } from './dto/create-freight.dto';

@Injectable()
export class LogisticsService {
  private freightCollection = db.collection('freights');

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly scheduleService: ScheduleService,
    private readonly financeService: FinanceService,
  ) {}

  private calculatePrice(distKm: number, weightKg: number): number {
    return 50 + distKm * 2.5 + weightKg * 0.1;
  }

  async requestFreight(userId: string, dto: CreateFreightDto) {
    const distance = 10;
    const suggestedPrice = this.calculatePrice(distance, dto.totalWeight);

    const freightDoc = this.freightCollection.doc();
    const freightData = {
      id: freightDoc.id,
      requesterId: userId,
      budgetId: dto.budgetId || null,
      status: 'WAITING_DRIVER',
      origin: dto.originCoords,
      destination: dto.destinationCoords,
      price: suggestedPrice,
      weight: dto.totalWeight,
      createdAt: new Date().toISOString(),
    };

    await freightDoc.set(freightData);
    return freightData;
  }

  async getAvailableFreights(lat: number, lng: number) {
    const snapshot = await this.freightCollection
      .where('status', '==', 'WAITING_DRIVER')
      .limit(10)
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

  async acceptFreight(driverId: string, freightId: string) {
    const ref = this.freightCollection.doc(freightId);
    const doc = await ref.get();

    if (!doc.exists) throw new NotFoundException('Frete não encontrado');

    await ref.update({
      driverId,
      status: 'IN_TRANSIT',
      acceptedAt: new Date().toISOString(),
    });

    return { success: true, message: 'Frete aceito! Vá até a loja.' };
  }

  async finishDelivery(freightId: string) {
    const ref = this.freightCollection.doc(freightId);
    const doc = await ref.get();

    if (!doc.exists) throw new NotFoundException('Frete não encontrado');
    const freightData = doc.data();

    await ref.update({
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    });

    await this.financeService.recordExpense(freightData.requesterId, {
      amount: freightData.price,
      category: 'FREIGHT',
      description: `Frete finalizado - Ref: ${freightId}`,
      relatedId: freightId,
    });

    if (freightData.budgetId) {
      try {
        const budget = await this.inventoryService.getBudgetById(
          freightData.budgetId,
        );
        if (budget && budget.items) {
          await this.inventoryService.updateWorkStock(
            freightData.requesterId,
            budget.items,
          );
        }
      } catch (e) {
        console.log(
          'Orçamento não encontrado para atualização de estoque, pulando...',
        );
      }
    }

    return { success: true, message: 'Entrega concluída!' };
  }
}
