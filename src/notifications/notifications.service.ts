import { Injectable } from '@nestjs/common';
import { db } from '../config/firebase.config';

@Injectable()
export class NotificationService {
  private notificationsCollection = db.collection('notifications');

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'ALERT' | 'INFO' | 'SUCCESS',
  ) {
    const docRef = this.notificationsCollection.doc();
    await docRef.set({
      id: docRef.id,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    });
    return { success: true };
  }

  async getMyNotifications(userId: string) {
    const snapshot = await this.notificationsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }
}
