import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../config/firebase.config';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');
  private userSettingsCollection = db.collection('userSettings');

  async getProductAverage(
    userId: string,
    productName: string,
  ): Promise<number> {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .limit(50)
      .get();

    let total = 0;
    let count = 0;
    const term = productName.toLowerCase().trim();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const item = data.items?.find((i: any) => i.product === term);
      if (item) {
        total += Number(item.price);
        count++;
      }
    });

    return count > 0 ? total / count : 0;
  }

  async createBudget(items: any[], userId: string) {
    const docRef = this.budgetsCollection.doc();
    const budgetData = {
      id: docRef.id,
      userId,
      items,
      totalValue: items.reduce((sum, i) => sum + (i.subtotal || 0), 0),
      createdAt: new Date(),
    };
    await docRef.set(budgetData);
    return budgetData;
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
      stats: {
        totalSpent,
        totalBudgets: budgets.length,
      },
      updatedAt: new Date().toISOString(),
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
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async addToWorkStock(userId: string, budgetId: string) {
    await this.budgetsCollection.doc(budgetId).update({ status: 'PURCHASED' });
    return { message: 'Itens enviados para o estoque da obra' };
  }

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    const data = await this.getBudgetById(budgetId);
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.text(`Orçamento: ${data.id}`);
      doc.text(`Total: R$ ${data.totalValue}`);
      doc.end();
    });
  }
}
