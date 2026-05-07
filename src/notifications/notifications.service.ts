import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../config/firebase.config';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

export type NotificationType = 'ALERT' | 'INFO' | 'SUCCESS';

@Injectable()
export class NotificationService {
  private notificationsCollection = db.collection('notifications');
  private usersCollection = db.collection('users');
  private mailer: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.mailer = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: Number(this.configService.get('SMTP_PORT', '587')),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  // ─── Core: salva no Firestore + dispara email + push ─────────────────────
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
  ) {
    // 1. Salva no Firestore
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

    // 2. Busca dados do usuário para e-mail e FCM token
    const userDoc = await this.usersCollection.doc(userId).get();
    const user = userDoc.exists ? userDoc.data() : null;

    // 3. Dispara em paralelo — sem bloquear a resposta principal
    const promises: Promise<any>[] = [];

    if (user?.email) {
      promises.push(
        this.sendEmail(user.email, title, message).catch(console.error),
      );
    }

    if (user?.fcmToken) {
      promises.push(
        this.sendPush(user.fcmToken, title, message).catch(console.error),
      );
    }

    await Promise.allSettled(promises);

    return { success: true, id: docRef.id };
  }

  // ─── E-mail ──────────────────────────────────────────────────────────────
  private async sendEmail(to: string, subject: string, text: string) {
    const smtpUser = this.configService.get('SMTP_USER');
    if (!smtpUser) return; // Sem SMTP configurado, silently skip

    await this.mailer.sendMail({
      from: `"Obra Justa" <${smtpUser}>`,
      to,
      subject,
      text,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1a1a1a">${subject}</h2>
          <p style="color:#444;line-height:1.6">${text}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Obra Justa — Gestão de Obras</p>
        </div>
      `,
    });
  }

  // ─── Firebase Cloud Messaging (Push) ─────────────────────────────────────
  private async sendPush(fcmToken: string, title: string, body: string) {
    if (!admin.apps.length) return;
    await admin
      .messaging()
      .send({ token: fcmToken, notification: { title, body } });
  }

  // ─── Helpers de domínio (usados pelos outros services) ───────────────────
  async notifyFreightAccepted(requesterId: string, driverId: string) {
    await Promise.all([
      this.createNotification(
        requesterId,
        '🚚 Frete aceito!',
        'Um entregador aceitou seu frete e está a caminho.',
        'SUCCESS',
      ),
      this.createNotification(
        driverId,
        '📦 Frete confirmado',
        'Vá até o endereço de coleta para buscar os materiais.',
        'INFO',
      ),
    ]);
  }

  async notifyDeliveryFinished(requesterId: string, freightId: string) {
    await this.createNotification(
      requesterId,
      '✅ Entrega concluída!',
      `Seus materiais foram entregues. Ref: ${freightId}`,
      'SUCCESS',
    );
  }

  async notifyPurchaseConfirmed(
    userId: string,
    budgetId: string,
    total: number,
  ) {
    await this.createNotification(
      userId,
      '🛒 Compra confirmada',
      `Orçamento #${budgetId} confirmado. R$ ${total.toFixed(2)} lançado nas despesas e estoque atualizado.`,
      'SUCCESS',
    );
  }

  async notifyLowStock(
    userId: string,
    items: { item: string; missing: number; deadline: string }[],
  ) {
    if (!items.length) return;
    const list = items
      .map(
        (i) =>
          `• ${i.item} (faltam ${i.missing} unidades — prazo: ${i.deadline})`,
      )
      .join('\n');
    await this.createNotification(
      userId,
      '⚠️ Estoque baixo',
      `Os seguintes itens precisam ser comprados:\n${list}`,
      'ALERT',
    );
  }

  // ─── Endpoints do controller ──────────────────────────────────────────────
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
    if (!doc.exists) throw new NotFoundException('Notificação não encontrada');
    await docRef.update({ read: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const batch = db.batch();
    const snapshot = await this.notificationsCollection
      .where('userId', '==', userId)
      .where('read', '==', false)
      .get();

    if (snapshot.empty)
      return { success: true, message: 'Nenhuma notificação pendente' };

    snapshot.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
    await batch.commit();
    return { success: true, count: snapshot.size };
  }
}
