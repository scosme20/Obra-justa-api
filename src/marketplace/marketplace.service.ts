import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../config/firebase.config';
import Groq from 'groq-sdk';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CreateCostDto } from './dto/create-cost.dto';

@Injectable()
export class MarketplaceService implements OnModuleInit {
  private profilesCollection = db.collection('profiles');
  private costsCollection = db.collection('construction_costs');
  private groq: Groq;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      console.error(
        '❌ [MarketplaceService] GROQ_API_KEY não encontrada no .env',
      );
    }
    this.groq = new Groq({ apiKey });
  }

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

  async createProfile(data: CreateProfileDto) {
    const docRef = this.profilesCollection.doc();
    const newProfile = {
      id: docRef.id,
      ...data,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      active: data.active ?? true,
    };
    await docRef.set(newProfile);
    return newProfile;
  }

  async getProfilesByType(type: string) {
    const snapshot = await this.profilesCollection
      .where('type', '==', type)
      .where('active', '==', true)
      .get();
    return snapshot.empty ? [] : snapshot.docs.map((doc) => doc.data());
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
      (a, b) => a.totalEstimated - b.totalEstimated || b.rating - a.rating,
    );

    let aiVerdict = null;
    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente técnico de obras. Seja curto e direto.',
          },
          {
            role: 'user',
            content: `Analise para ${specialty}: ${JSON.stringify(sorted.slice(0, 2))}. Recomende o melhor em 1 frase.`,
          },
        ],
        model: 'llama-3.3-70b-versatile',
      });
      aiVerdict = completion.choices[0]?.message?.content;
    } catch (e) {
      aiVerdict =
        'IA em manutenção. Escolha pelo melhor preço e proximidade abaixo.';
    }

    return { aiVerdict, results: sorted };
  }

  async addConstructionCost(userId: string, data: CreateCostDto) {
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
    if (totalPlanned > 0 && totalActual > totalPlanned) {
      healthScore = Math.max(
        0,
        100 - ((totalActual - totalPlanned) / totalPlanned) * 100,
      );
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
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Você é um consultor financeiro de obras.',
          },
          {
            role: 'user',
            content: `Gasto Real: R$${summary.totalActual} de R$${summary.totalPlanned}. Score: ${summary.healthScore}%. Dê 1 conselho curto.`,
          },
        ],
        model: 'llama-3.3-70b-versatile',
      });
      return {
        advice: completion.choices[0]?.message?.content,
        healthScore: summary.healthScore,
      };
    } catch (e) {
      return {
        advice: 'Mantenha seus custos atualizados.',
        healthScore: summary.healthScore,
      };
    }
  }

  async getStoreOffers(category?: string, userLat?: number, userLng?: number) {
    const snapshot = await this.profilesCollection
      .where('type', '==', 'store')
      .get();
    const offers = [];

    snapshot.docs.forEach((doc) => {
      const store = doc.data();
      if (store.offers && Array.isArray(store.offers)) {
        const dist =
          userLat && userLng && store.lat && store.lng
            ? this.calculateDistance(userLat, userLng, store.lat, store.lng)
            : null;

        const filtered = category
          ? store.offers.filter(
              (o: any) => o.category?.toLowerCase() === category.toLowerCase(),
            )
          : store.offers;

        offers.push(
          ...filtered.map((o: any) => ({
            ...o,
            storeName: store.name,
            distanceKm: dist,
          })),
        );
      }
    });
    return offers.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  async saveToFavorites(userId: string, profileId: string) {
    await db
      .collection('user_favorites')
      .doc(`${userId}_${profileId}`)
      .set({ userId, profileId, savedAt: new Date().toISOString() });
    return { message: 'Salvo!' };
  }

  async removeFavorite(userId: string, profileId: string) {
    await db
      .collection('user_favorites')
      .doc(`${userId}_${profileId}`)
      .delete();
    return { message: 'Removido!' };
  }

  async addReview(
    profileId: string,
    userId: string,
    rating: number,
    comment: string,
  ) {
    const reviewRef = db.collection('reviews').doc();
    const review = {
      id: reviewRef.id,
      profileId,
      userId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
    await reviewRef.set(review);
    await this.updateProfileRating(profileId);
    return review;
  }

  private async updateProfileRating(profileId: string) {
    const snapshot = await db
      .collection('reviews')
      .where('profileId', '==', profileId)
      .get();
    if (snapshot.empty) return;
    const ratings = snapshot.docs.map((d) => d.data().rating);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    await this.profilesCollection.doc(profileId).update({
      rating: parseFloat(avg.toFixed(1)),
      reviewCount: ratings.length,
    });
  }
}
