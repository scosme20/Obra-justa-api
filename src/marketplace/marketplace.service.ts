import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class MarketplaceService {
  private profilesCollection = db.collection('profiles');
  private costsCollection = db.collection('construction_costs');
  private genAI = new GoogleGenerativeAI('SUA_CHAVE_AQUI');

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return parseFloat(
      (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1),
    );
  }

  async createProfile(data: any) {
    const docRef = this.profilesCollection.doc();
    const newProfile = {
      id: docRef.id,
      ...data,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      active: true,
    };
    await docRef.set(newProfile);
    return newProfile;
  }

  async getProfilesByType(type: string) {
    const snapshot = await this.profilesCollection
      .where('type', '==', type)
      .where('active', '==', true)
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map((doc) => doc.data());
  }

  async getProfileById(id: string) {
    const doc = await this.profilesCollection.doc(id).get();
    return doc.exists ? doc.data() : null;
  }

  async getProfessionalMatch(
    specialty: string,
    amount: number,
    unit: string,
    userLat?: number,
    userLng?: number,
  ) {
    const snapshot = await this.profilesCollection
      .where('specialty', '==', specialty)
      .where('active', '==', true)
      .get();
    const candidates = snapshot.docs.map((doc) => doc.data());

    const matches = candidates.map((pro: any) => {
      const distanceKm =
        userLat && userLng && pro.lat && pro.lng
          ? this.calculateDistance(userLat, userLng, pro.lat, pro.lng)
          : null;
      return {
        ...pro,
        distanceKm,
        totalEstimated: (pro.pricePerUnit || 0) * amount,
      };
    });

    const sorted = matches.sort(
      (a: any, b: any) =>
        a.totalEstimated - b.totalEstimated || b.rating - a.rating,
    );

    let aiVerdict = null;
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });
      const prompt = `Analise estes profissionais para ${specialty}: ${JSON.stringify(sorted.slice(0, 2))}. Recomende o melhor em 1 frase curta.`;
      const result = await model.generateContent(prompt);
      aiVerdict = result.response.text();
    } catch (e) {
      aiVerdict = 'Escolha baseada em menor custo e proximidade.';
    }

    return { aiVerdict, results: sorted };
  }

  async saveToFavorites(userId: string, profileId: string) {
    const favoriteId = `${userId}_${profileId}`;
    await db.collection('user_favorites').doc(favoriteId).set({
      userId,
      profileId,
      savedAt: new Date().toISOString(),
    });
    return { message: 'Adicionado aos favoritos' };
  }

  async getUserFavorites(userId: string) {
    const snapshot = await db
      .collection('user_favorites')
      .where('userId', '==', userId)
      .get();
    if (snapshot.empty) return [];

    return await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data: any = doc.data();
        const profile = await this.getProfileById(data.profileId);
        return { ...data, profileDetails: profile };
      }),
    );
  }

  async removeFavorite(userId: string, profileId: string) {
    const favoriteId = `${userId}_${profileId}`;
    await db.collection('user_favorites').doc(favoriteId).delete();
    return { message: 'Removido dos favoritos' };
  }

  async addReview(
    profileId: string,
    userId: string,
    rating: number,
    comment: string,
  ) {
    const reviewRef = db.collection('reviews').doc();
    const newReview = {
      id: reviewRef.id,
      profileId,
      userId,
      rating: Math.min(5, Math.max(1, rating)),
      comment,
      createdAt: new Date().toISOString(),
    };
    await reviewRef.set(newReview);
    await this.updateProfileRating(profileId);
    return newReview;
  }

  private async updateProfileRating(profileId: string) {
    const snapshot = await db
      .collection('reviews')
      .where('profileId', '==', profileId)
      .get();
    if (snapshot.empty) return;
    const ratings = snapshot.docs.map((doc) => doc.data().rating);
    const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    await this.profilesCollection.doc(profileId).update({
      rating: parseFloat(average.toFixed(1)),
      reviewCount: ratings.length,
    });
  }

  async getReviewsByProfile(profileId: string) {
    const snapshot = await db
      .collection('reviews')
      .where('profileId', '==', profileId)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async addConstructionCost(userId: string, data: any) {
    const docRef = this.costsCollection.doc();
    const costEntry = {
      id: docRef.id,
      userId,
      ...data,
      overBudget: data.actualValue > data.plannedValue,
      difference: data.actualValue - data.plannedValue,
      date: new Date().toISOString(),
    };
    await docRef.set(costEntry);
    return costEntry;
  }

  async getFinancialSummary(userId: string) {
    const snapshot = await this.costsCollection
      .where('userId', '==', userId)
      .get();
    if (snapshot.empty)
      return { totalPlanned: 0, totalActual: 0, healthScore: 100 };

    const costs = snapshot.docs.map((doc) => doc.data() as any);
    const totalPlanned = costs.reduce((acc, c) => acc + c.plannedValue, 0);
    const totalActual = costs.reduce((acc, c) => acc + c.actualValue, 0);

    let healthScore = 100;
    if (totalActual > totalPlanned) {
      const percentOver = ((totalActual - totalPlanned) / totalPlanned) * 100;
      healthScore = Math.max(0, 100 - percentOver);
    }

    return {
      totalPlanned,
      totalActual,
      healthScore: parseFloat(healthScore.toFixed(1)),
      items: costs,
    };
  }

  async getAiFinanceAdvice(userId: string) {
    const summary = await this.getFinancialSummary(userId);
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });
      const prompt = `Finanças da obra: Planejado R$${summary.totalPlanned}, Real R$${summary.totalActual}, Score ${summary.healthScore}%. Dê um conselho curto.`;
      const result = await model.generateContent(prompt);
      return {
        advice: result.response.text(),
        healthScore: summary.healthScore,
      };
    } catch (e) {
      return {
        advice: 'Mantenha os registros atualizados.',
        healthScore: summary.healthScore,
      };
    }
  }

  async getStoreOffers(category?: string, userLat?: number, userLng?: number) {
    const snapshot = await this.profilesCollection
      .where('type', '==', 'store')
      .get();
    const allOffers = [];

    snapshot.docs.forEach((doc) => {
      const store: any = doc.data();
      const distanceKm =
        userLat && userLng && store.lat && store.lng
          ? this.calculateDistance(userLat, userLng, store.lat, store.lng)
          : null;

      if (store.offers) {
        const filtered = category
          ? store.offers.filter(
              (o: any) => o.category.toLowerCase() === category.toLowerCase(),
            )
          : store.offers;

        allOffers.push(
          ...filtered.map((o: any) => ({
            ...o,
            storeName: store.name,
            storeId: store.id,
            distanceKm,
            address: store.address,
          })),
        );
      }
    });

    return userLat
      ? allOffers.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999))
      : allOffers;
  }
}
