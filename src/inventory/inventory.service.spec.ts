import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class InventoryService {
  private collection = db.collection('inventory');
  private budgetsCollection = db.collection('budgets');

  async updatePrice(storeId: string, productId: string, price: number) {
    const docId = `${storeId}_${productId}`;
    const docRef = this.collection.doc(docId);

    const data = {
      id: docId,
      storeId,
      productId,
      price,
      updatedAt: new Date(),
    };

    await docRef.set(data, { merge: true });
    return data;
  }

  async getRankingByProduct(productId: string) {
    const snapshot = await this.collection
      .where('productId', '==', productId)
      .orderBy('price', 'asc') 
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }

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
        category: item.category || 'Outros',
        subtotal: (Number(item.quantity) || 1) * (Number(item.price) || 0),
      })),
    };
  
    await docRef.set(budgetData);
    return budgetData;
  }
}
}
