import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../config/firebase.config';
import { InventoryService } from '../inventory/inventory.service';
import { FinanceService } from '../finance/finance.service';
import { NotificationService } from '../notifications/notifications.service';
import { CreateFreightDto } from './dto/create-freight.dto';

const EARTH_RADIUS_KM = 6371;
const MAX_FREIGHT_RADIUS_KM = 50;

@Injectable()
export class LogisticsService {
  private freightCollection = db.collection('freights');

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly financeService: FinanceService,
    private readonly notificationService: NotificationService,
  ) {}

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) ** 2;
    return parseFloat(
      (
        EARTH_RADIUS_KM *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      ).toFixed(1),
    );
  }

  private calculatePrice(distKm: number, weightKg: number): number {
    return parseFloat((50 + distKm * 2.5 + weightKg * 0.1).toFixed(2));
  }

  async requestFreight(userId: string, dto: CreateFreightDto) {
    const distance = this.calculateDistance(
      dto.originCoords.lat,
      dto.originCoords.lng,
      dto.destinationCoords.lat,
      dto.destinationCoords.lng,
    );
    const suggestedPrice = this.calculatePrice(distance, dto.totalWeight);

    const freightDoc = this.freightCollection.doc();
    const freightData = {
      id: freightDoc.id,
      requesterId: userId,
      budgetId: dto.budgetId || null,
      status: 'WAITING_DRIVER',
      origin: dto.originCoords,
      destination: dto.destinationCoords,
      distanceKm: distance,
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
      .limit(50)
      .get();

    const freights = snapshot.docs.map((doc) => {
      const data = doc.data();
      const distFromDriver =
        lat && lng && data.origin
          ? this.calculateDistance(lat, lng, data.origin.lat, data.origin.lng)
          : null;
      return { ...data, distFromDriverKm: distFromDriver };
    });

    return freights
      .filter(
        (f) =>
          f.distFromDriverKm === null ||
          f.distFromDriverKm <= MAX_FREIGHT_RADIUS_KM,
      )
      .sort(
        (a, b) => (a.distFromDriverKm ?? 999) - (b.distFromDriverKm ?? 999),
      );
  }

  async acceptFreight(driverId: string, freightId: string) {
    const ref = this.freightCollection.doc(freightId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Frete não encontrado');

    const freight = doc.data();
    await ref.update({
      driverId,
      status: 'IN_TRANSIT',
      acceptedAt: new Date().toISOString(),
    });

    // Notifica solicitante e motorista
    await this.notificationService.notifyFreightAccepted(
      freight.requesterId,
      driverId,
    );

    return { success: true, message: 'Frete aceito! Vá até a loja.' };
  }

  async finishDelivery(freightId: string) {
    const ref = this.freightCollection.doc(freightId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Frete não encontrado');

    const freight = doc.data();
    await ref.update({
      status: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    });

    await this.financeService.recordExpense(freight.requesterId, {
      amount: freight.price,
      category: 'FREIGHT',
      description: `Frete finalizado - Ref: ${freightId}`,
      relatedId: freightId,
    });

    if (freight.budgetId) {
      try {
        const budget = await this.inventoryService.getBudgetById(
          freight.budgetId,
        );
        if (budget?.items) {
          await this.inventoryService.updateWorkStock(
            freight.requesterId,
            budget.items,
          );
        }
      } catch {
        console.log('Orçamento não encontrado para atualização de estoque.');
      }
    }

    // Notifica solicitante
    await this.notificationService.notifyDeliveryFinished(
      freight.requesterId,
      freightId,
    );

    return { success: true, message: 'Entrega concluída!' };
  }
}
