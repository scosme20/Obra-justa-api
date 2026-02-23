import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../config/firebase.config';
import * as PDFDocument from 'pdfkit';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');
  private workStockCollection = db.collection('work_stock');
  private usersCollection = db.collection('users');

  constructor(private readonly financeService: FinanceService) {}

  async getProductAverage(
    userId: string,
    productName: string,
  ): Promise<number> {
    const term = productName.toLowerCase().trim();
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();

    let total = 0;
    let count = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const item = data.items?.find(
        (i: any) => i.product.toLowerCase().trim() === term,
      );
      if (item) {
        total += Number(item.price);
        count++;
      }
    });

    return count > 0 ? total / count : 0;
  }

  async createBudget(items: any[], userId: string, extraInfo: any = {}) {
    const docRef = this.budgetsCollection.doc();
    const totalValue = items.reduce(
      (sum, i) => sum + (Number(i.price) * Number(i.quantity) || 0),
      0,
    );

    const budgetData = {
      id: docRef.id,
      userId,
      items: items.map((item) => ({
        ...item,
        product: item.product.toLowerCase().trim(),
      })),
      totalValue,
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      requestedBy: extraInfo.requestedBy || 'Não informado',
      contractor: extraInfo.contractor || 'Equipe Geral',
      storeName: extraInfo.storeName || 'Fornecedor não informado',
      deliveryMan: extraInfo.deliveryMan || 'A definir',
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getUserDashboard(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();

    const budgets = snapshot.docs.map((d) => d.data());
    const totalSpent = budgets.reduce(
      (acc, b: any) => acc + (b.totalValue || 0),
      0,
    );

    return {
      stats: {
        totalSpent,
        totalBudgets: budgets.length,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async updateWorkStock(userId: string, items: any[]) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();
    const currentItems = stockDoc.exists ? stockDoc.data().items : [];

    items.forEach((newItem) => {
      const productName = newItem.product.toLowerCase().trim();
      const existingIndex = currentItems.findIndex(
        (i: any) => i.product === productName,
      );

      if (existingIndex > -1) {
        currentItems[existingIndex].quantity += Number(newItem.quantity);
        currentItems[existingIndex].updatedAt = new Date().toISOString();
      } else {
        currentItems.push({
          product: productName,
          quantity: Number(newItem.quantity),
          category: newItem.category || 'Outros',
          addedAt: new Date().toISOString(),
        });
      }
    });

    await stockRef.set(
      { items: currentItems, lastUpdate: new Date().toISOString() },
      { merge: true },
    );
    return { success: true };
  }

  async addToWorkStock(userId: string, budgetId: string) {
    const budget = await this.getBudgetById(budgetId);
    if (budget.status === 'PURCHASED')
      throw new BadRequestException('Já processado');

    await this.updateWorkStock(userId, budget.items);

    await this.financeService.recordExpense(userId, {
      amount: budget.totalValue,
      category: 'MATERIAL',
      description: `Compra - Orçamento ${budgetId}`,
      relatedId: budgetId,
    });

    await this.budgetsCollection.doc(budgetId).update({ status: 'PURCHASED' });
    return { success: true };
  }

  async getBudgetById(id: string) {
    const doc = await this.budgetsCollection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Orçamento não encontrado');
    return { id: doc.id, ...doc.data() } as any;
  }

  async getAllBudgets(userId: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getWorkStock(userId: string) {
    const doc = await this.workStockCollection.doc(userId).get();
    return doc.exists ? doc.data() : { items: [] };
  }

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    const data = await this.getBudgetById(budgetId);

    const userDoc = await this.usersCollection.doc(data.userId).get();
    const userName = userDoc.exists ? userDoc.data().name : 'Sebastiao';

    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.rect(0, 0, 612, 85).fill('#1A237E');
      doc.fillColor('#FFFFFF').fontSize(22).text('OBRA JUSTA', 50, 25);
      doc
        .fontSize(10)
        .text('Relatório Inteligente de Suprimentos e Logística', 50, 55);

      const agora = new Date();
      const timestamp = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      doc.fillColor('#333333').moveDown(4);

      doc.fontSize(9).font('Helvetica-Bold').text(`RESPONSÁVEL:`, 50, 105);
      doc.font('Helvetica').text(userName.toUpperCase(), 140, 105);

      doc.font('Helvetica-Bold').text(`SOLICITANTE:`, 50, 120);
      doc.font('Helvetica').text(data.requestedBy || userName, 140, 120);

      doc.font('Helvetica-Bold').text(`EXECUTOR:`, 50, 135);
      doc
        .font('Helvetica')
        .text(data.contractor || 'Mestre de Obras / Equipe', 140, 135);

      doc.font('Helvetica-Bold').text(`ID PEDIDO:`, 330, 105);
      doc.font('Helvetica').text(data.id, 410, 105);

      doc.font('Helvetica-Bold').text(`LOJA/FORNEC.:`, 330, 120);
      doc.font('Helvetica').text(data.storeName || 'Cotação Geral', 410, 120);

      doc.font('Helvetica-Bold').text(`ENTREGADOR:`, 330, 135);
      doc.font('Helvetica').text(data.deliveryMan || 'A Definir', 410, 135);

      doc
        .fontSize(8)
        .fillColor('#757575')
        .text(`Gerado em: ${timestamp}`, 50, 155, {
          align: 'right',
          width: 500,
        });

      doc.moveDown();
      doc.moveTo(50, 165).lineTo(550, 165).stroke('#EEEEEE');

      const tableTop = 185;
      doc.fillColor('#1A237E').font('Helvetica-Bold').fontSize(10);
      doc.text('DESCRIÇÃO DO MATERIAL', 50, tableTop);
      doc.text('QTD', 250, tableTop);
      doc.text('PREÇO UN.', 320, tableTop);
      doc.text('ANÁLISE IA', 450, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke('#333333');

      let y = tableTop + 25;
      data.items.forEach((item: any) => {
        doc.font('Helvetica').fillColor('#333333');
        doc.text(item.product.toUpperCase(), 50, y);
        doc.text(item.quantity.toString(), 250, y);
        doc.text(`R$ ${Number(item.price).toFixed(2)}`, 320, y);

        if (item.status) {
          const statusColor = item.color === 'red' ? '#D32F2F' : '#388E3C';
          doc
            .fillColor(statusColor)
            .font('Helvetica-Bold')
            .text(item.status, 450, y);
        } else {
          doc.fillColor('#757575').text('PENDENTE', 450, y);
        }

        y += 20;
        doc
          .moveTo(50, y - 5)
          .lineTo(550, y - 5)
          .dash(2, { space: 2 })
          .stroke('#EEEEEE')
          .undash();
      });

      y += 20;
      doc.rect(50, y, 500, 50).fill('#F5F5F5');
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('NOTAS DE APLICAÇÃO:', 60, y + 10);
      doc
        .fillColor('#666666')
        .font('Helvetica')
        .text(
          `Material destinado à etapa de ${data.items[0]?.category || 'Construção'}. O executor deve validar a quantidade recebida e reportar avarias imediatamente.`,
          60,
          y + 22,
          { width: 480 },
        );

      doc
        .fillColor('#333333')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(`TOTAL GERAL: R$ ${data.totalValue.toFixed(2)}`, 50, y + 70, {
          align: 'right',
          width: 500,
        });

      doc
        .fontSize(7)
        .fillColor('#999999')
        .text(
          'Obra Justa - Inteligência de Dados aplicada à Construção Civil. Documento para fins de conferência interna.',
          50,
          730,
          { align: 'center' },
        );

      doc.end();
    });
  }
}
