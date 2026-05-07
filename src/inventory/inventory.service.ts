import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../config/firebase.config';
import * as PDFDocument from 'pdfkit';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');
  private workStockCollection = db.collection('work_stock');
  private usersCollection = db.collection('users');

  constructor(private readonly financeService: FinanceService) {}

  async createBudget(dataOrItems: any, userId: string, extraInfo: any = {}) {
    const docRef = this.budgetsCollection.doc();

    const itemsRaw = Array.isArray(dataOrItems)
      ? dataOrItems
      : dataOrItems.items || [];
    const info = Array.isArray(dataOrItems) ? extraInfo : dataOrItems;

    const mappedItems = itemsRaw.map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return {
        ...item,
        product: String(item.product || 'Sem nome')
          .toLowerCase()
          .trim(),
        brand: item.brand || 'N/A',
        statusIa: (item.statusIa || item.status || 'NA MÉDIA').toUpperCase(),
        variation: item.variation || '0%',
        price,
        quantity,
        subtotal: price * quantity,
      };
    });

    const totalValue = mappedItems.reduce((sum, i) => sum + i.subtotal, 0);

    const budgetData = {
      id: docRef.id,
      userId,
      items: mappedItems,
      totalValue,
      totalEconomy: info.totalEconomy || '0%',
      economyValue: info.economyValue || 'R$ 0.00',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      requestedBy: info.requestedBy || 'Não informado',
      contractor: info.contractor || 'N/A',
      storeName: info.storeName || 'Fornecedor não informado',
      deliveryMan: info.deliveryMan || 'N/A',
      logisticsInfo: {
        origin: info.logisticsInfo?.origin || 'N/A',
        destination: info.logisticsInfo?.destination || 'N/A',
        distance: info.logisticsInfo?.distance || '0 KM',
        deliveryStatus: info.logisticsInfo?.deliveryStatus || 'PENDENTE',
      },
      applicationNotes: info.applicationNotes || 'Sem notas adicionais.',
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getWorkStock(userId: string) {
    const doc = await this.workStockCollection.doc(userId).get();
    return doc.exists ? doc.data() : { items: [] };
  }

  async updateWorkStock(userId: string, items: any[]) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();
    const currentItems = stockDoc.exists ? stockDoc.data().items : [];

    items.forEach((newItem) => {
      const productName = String(newItem.product).toLowerCase().trim();
      const existingIndex = currentItems.findIndex(
        (i: any) => i.product === productName,
      );

      if (existingIndex > -1) {
        currentItems[existingIndex].quantity += Number(newItem.quantity);
        currentItems[existingIndex].updatedAt = new Date().toISOString();
      } else {
        currentItems.push({
          product: productName,
          quantity: Number(newItem.quantity),
          category: newItem.category || 'Outros',
          addedAt: new Date().toISOString(),
        });
      }
    });

    await stockRef.set(
      { items: currentItems, lastUpdate: new Date().toISOString() },
      { merge: true },
    );
    return { success: true };
  }

  async consumeFromStock(userId: string, product: string, quantity: number) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();

    if (!stockDoc.exists)
      throw new NotFoundException('Estoque não encontrado.');

    const data = stockDoc.data();
    const items = data.items || [];
    const productName = product.toLowerCase().trim();
    const itemIndex = items.findIndex((i: any) => i.product === productName);

    if (itemIndex === -1) {
      throw new BadRequestException(
        `O item "${product}" não existe no seu estoque.`,
      );
    }

    if (items[itemIndex].quantity < quantity) {
      throw new BadRequestException(
        `Saldo insuficiente. Disponível: ${items[itemIndex].quantity}. Tentativa: ${quantity}`,
      );
    }

    items[itemIndex].quantity -= Number(quantity);
    items[itemIndex].updatedAt = new Date().toISOString();

    await stockRef.update({ items, lastUpdate: new Date().toISOString() });
    return {
      success: true,
      remaining: items[itemIndex].quantity,
      product: productName,
    };
  }

  async getBudgetById(id: string) {
    const doc = await this.budgetsCollection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Orçamento não encontrado');
    return { id: doc.id, ...doc.data() } as any;
  }

  async getAllBudgets(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getUserDashboard(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();
    const budgets = snapshot.docs.map((d) => d.data());
    const totalSpent = budgets.reduce(
      (acc, b: any) => acc + (b.totalValue || 0),
      0,
    );
    return {
      stats: { totalSpent, totalBudgets: budgets.length },
      updatedAt: new Date().toISOString(),
    };
  }

  async addToWorkStock(userId: string, budgetId: string) {
    const budget = await this.getBudgetById(budgetId);
    if (budget.status === 'PURCHASED')
      throw new BadRequestException('Já processado.');

    await this.updateWorkStock(userId, budget.items);
    await this.financeService.recordExpense(userId, {
      amount: budget.totalValue,
      category: 'MATERIAL',
      description: `Compra - Orçamento ${budgetId}`,
      relatedId: budgetId,
    });

    await this.budgetsCollection.doc(budgetId).update({ status: 'PURCHASED' });
    return { success: true };
  }

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    return Buffer.from([]);
  }
}
