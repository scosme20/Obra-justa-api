import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class InventoryService {
  private inventoryCollection = db.collection('inventory');
  private budgetsCollection = db.collection('budgets');

  async createBudget(items: any[], userId: string) {
    const docRef = this.budgetsCollection.doc();

    const totalValue = items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      return sum + quantity * price;
    }, 0);

    const budgetData = {
      id: docRef.id,
      userId,
      items: items.map((item) => ({
        ...item,
        subtotal: (Number(item.quantity) || 0) * (Number(item.price) || 0),
      })),
      totalValue,
      totalItems: items.length,
      createdAt: new Date(),
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getAllBudgets(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();

      let formattedDate = data.createdAt;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        formattedDate = data.createdAt.toDate().toISOString();
      }

      return {
        id: doc.id,
        ...data,
        createdAt: formattedDate,
      };
    });
  }

  async deleteBudget(id: string) {
    await this.budgetsCollection.doc(id).delete();
    return { deleted: true, id };
  }

  async getUserDashboard(userId: string) {
    const snapshots = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();

    const budgets = snapshots.docs.map((doc) => doc.data());

    const totalSpent = budgets.reduce(
      (sum, budget) => sum + (budget.totalValue || 0),
      0,
    );
    const totalBudgets = budgets.length;

    return {
      userId,
      totalSpent,
      totalBudgets,
      currency: 'BRL',
      lastUpdate: new Date(),
    };
  }
}
