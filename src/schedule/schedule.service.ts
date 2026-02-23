import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class ScheduleService {
  private scheduleCollection = db.collection('schedules');

  async getMySchedule(userId: string) {
    const snapshot = await this.scheduleCollection
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async updateTaskStatus(userId: string, taskId: string, status: string) {
    const snapshot = await this.scheduleCollection
      .where('userId', '==', userId)
      .get();

    if (snapshot.empty)
      throw new NotFoundException('Cronograma não encontrado');

    const doc = snapshot.docs[0];
    const data = doc.data();

    const tasks = data.tasks.map((t) =>
      t.id === taskId
        ? { ...t, status, updatedAt: new Date().toISOString() }
        : t,
    );

    await doc.ref.update({ tasks });
    return { success: true };
  }

  async handleDelay(userId: string, taskId: string, days: number) {
    return { success: true, message: `Cronograma adiado em ${days} dias.` };
  }

  async generateAutoSchedule(userId: string, description: string) {
    return {
      success: true,
      message: 'Cronograma gerado automaticamente.',
      description,
    };
  }
}
