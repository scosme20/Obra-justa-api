import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');

  async createBudget(items: any[], userId: string) {
    const docRef = this.budgetsCollection.doc();

    const budgetData = {
      id: docRef.id,
      userId,
      items: items.map((item) => ({
        ...item,
        product: item.product.toLowerCase().trim(),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        subtotal: (Number(item.quantity) || 1) * (Number(item.price) || 0),
      })),
      totalValue: items.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 1) * (Number(item.price) || 0),
        0,
      ),
      totalItems: items.length,
      createdAt: new Date(),
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getAllBudgets(userId: string, limit: number = 20, search?: string) {
    const query = this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));

    const snapshot = await query.get();

    let budgets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      } as any;
    });

    if (search) {
      const term = search.toLowerCase();
      budgets = budgets.filter(
        (b) =>
          b.items &&
          Array.isArray(b.items) &&
          b.items.some((item: any) =>
            item.product.toLowerCase().includes(term),
          ),
      );
    }

    return budgets;
  }

  async deleteBudget(id: string) {
    const doc = await this.budgetsCollection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Orçamento não encontrado');
    await this.budgetsCollection.doc(id).delete();
    return {
      message: `Orçamento removido`,
      id,
      timestamp: new Date().toISOString(),
    };
  }

  async getUserDashboard(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();
    const budgets = snapshot.docs.map((doc) => doc.data());

    const totalSpent = budgets.reduce(
      (sum, b) => sum + (Number(b.totalValue) || 0),
      0,
    );

    const categoryTotals = {};
    budgets.forEach((budget) => {
      budget.items?.forEach((item) => {
        const cat = item.category || 'Outros';
        categoryTotals[cat] =
          (categoryTotals[cat] || 0) + (Number(item.subtotal) || 0);
      });
    });

    return {
      userId,
      stats: {
        totalSpent,
        totalBudgets: budgets.length,
        byCategory: categoryTotals,
        averageBudget:
          budgets.length > 0 ? (totalSpent / budgets.length).toFixed(2) : 0,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async getPriceComparison(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();
    const allItems = [];
    snapshot.docs.forEach((doc) => {
      if (doc.data().items) allItems.push(...doc.data().items);
    });

    const analysis = allItems.reduce((acc, item) => {
      const name = item.product.toLowerCase().trim();

      if (!acc[name]) {
        acc[name] = {
          product: name,
          minPrice: item.price,
          maxPrice: item.price,
          avgPrice: 0,
          count: 0,
        };
      }

      const group = acc[name];
      group.minPrice = Math.min(group.minPrice, item.price);
      group.maxPrice = Math.max(group.maxPrice, item.price);
      group.count += 1;
      group.avgPrice =
        (group.avgPrice * (group.count - 1) + item.price) / group.count;

      const gap = group.maxPrice - group.minPrice;
      group.priceGapPercentage =
        group.minPrice > 0
          ? ((gap / group.minPrice) * 100).toFixed(1) + '%'
          : '0%';

      return acc;
    }, {});

    return Object.values(analysis);
  }

  async getProductAverage(
    userId: string,
    productName: string,
  ): Promise<number> {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    let total = 0,
      count = 0;
    snapshot.docs.forEach((doc) => {
      const match = doc
        .data()
        .items?.find((i) => i.product === productName.toLowerCase().trim());
      if (match) {
        total += match.price;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }

  async getCategoryReport(userId: string, category: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();

    const allItems = [];
    let categoryTotal = 0;

    snapshot.docs.forEach((doc) => {
      const budget = doc.data();

      const filteredItems =
        budget.items?.filter(
          (item: any) =>
            item.category?.trim().toLowerCase() ===
            category.trim().toLowerCase(),
        ) || [];

      filteredItems.forEach((item: any) => {
        categoryTotal += item.subtotal;

        const formattedDate = budget.createdAt?.toDate
          ? budget.createdAt.toDate().toISOString()
          : budget.createdAt;

        allItems.push({
          ...item,
          budgetId: doc.id,
          date: formattedDate,
        });
      });
    });

    return {
      userId,
      category:
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(),
      totalSpentInCategory: Number(categoryTotal.toFixed(2)),
      itemCount: allItems.length,
      history: allItems.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }
}
