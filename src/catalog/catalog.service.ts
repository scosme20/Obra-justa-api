import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';
import { MasterProduct } from './interfaces/product.interface';

@Injectable()
export class CatalogService {
  private collection = db.collection('master_products');

  async createProduct(product: MasterProduct) {
    const docRef = this.collection.doc();
    const newProduct = {
      ...product,
      id: docRef.id,
      createdAt: new Date(),
    };
    await docRef.set(newProduct);
    return newProduct;
  }

  async findAll() {
    const snapshot = await this.collection.where('active', '==', true).get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async findByCategory(category: string) {
    const snapshot = await this.collection
      .where('category', '==', category)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
