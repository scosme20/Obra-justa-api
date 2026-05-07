import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';

export type ExpenseCategory = 'MATERIAL' | 'FREIGHT' | 'LABOR' | 'OTHER';

@Injectable()
export class FinanceService {
  private transactionsCollection = db.collection('transactions');

  async recordExpense(
    userId: string,
    data: {
      amount: number;
      category: ExpenseCategory;
      description: string;
      relatedId?: string;
    },
  ) {
    const docRef = this.transactionsCollection.doc();
    const transaction = {
      id: docRef.id,
      userId,
      ...data,
      date: new Date().toISOString(),
    };
    await docRef.set(transaction);
    return transaction;
  }

  async recordLabor(
    userId: string,
    data: {
      workerName: string;
      role: string;
      amount: number;
      date: string;
      description?: string;
    },
  ) {
    return this.recordExpense(userId, {
      amount: data.amount,
      category: 'LABOR',
      description: `[Mão de obra] ${data.role} – ${data.workerName}${data.description ? ': ' + data.description : ''}`,
      relatedId: `labor_${Date.now()}`,
    });
  }

  async getWorkSummary(userId: string) {
    const snapshot = await this.transactionsCollection
      .where('userId', '==', userId)
      .get();
    const transactions = snapshot.docs.map((doc) => doc.data());

    const summary = {
      totalSpent: 0,
      byCategory: { MATERIAL: 0, FREIGHT: 0, LABOR: 0, OTHER: 0 },
      count: transactions.length,
    };

    transactions.forEach((t: any) => {
      summary.totalSpent += t.amount;
      if (summary.byCategory[t.category] !== undefined) {
        summary.byCategory[t.category] += t.amount;
      } else {
        summary.byCategory.OTHER += t.amount;
      }
    });

    return summary;
  }
}
