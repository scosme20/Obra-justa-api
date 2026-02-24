import { Injectable, NotFoundException } from '@nestjs/common';
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
    return { success: true, id: docRef.id };
  }

  async getMyNotifications(userId: string) {
    const snapshot = await this.notificationsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async markAsRead(notificationId: string) {
    const docRef = this.notificationsCollection.doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException('Notificação não encontrada');
    }

    await docRef.update({ read: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const batch = db.batch();
    const snapshot = await this.notificationsCollection
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    if (snapshot.empty) {
      return { success: true, message: 'Nenhuma notificação pendente' };
    }

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    return { success: true, count: snapshot.size };
  }
}
