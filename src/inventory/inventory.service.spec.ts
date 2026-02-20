import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class InventoryService {
  private collection = db.collection('inventory');

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

  // Buscar todos os preços de um produto específico 
  async getRankingByProduct(productId: string) {
    const snapshot = await this.collection
      .where('productId', '==', productId)
      .orderBy('price', 'asc') // O mais barato primeiro
      .get();

    return snapshot.docs.map((doc) => doc.data());
  }
}
