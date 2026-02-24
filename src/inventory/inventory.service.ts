import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
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

  async createBudget(dataOrItems: any, userId: string, extraInfo: any = {}) {
    const docRef = this.budgetsCollection.doc();

    const items = Array.isArray(dataOrItems)
      ? dataOrItems
      : dataOrItems.items || [];
    const info = Array.isArray(dataOrItems) ? extraInfo : dataOrItems;

    const totalValue = items.reduce(
      (sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0),
      0,
    );

    const budgetData = {
      id: docRef.id,
      userId,
      items: items.map((item) => ({
        ...item,
        product: String(item.product || 'Sem nome')
          .toLowerCase()
          .trim(),
        brand: item.brand || 'N/A',
        statusIa: item.statusIa || item.status || 'NA MÉDIA',
        variation: item.variation || '0%',
        subtotal: Number(item.price || 0) * Number(item.quantity || 0),
      })),
      totalValue,
      totalEconomy: info.totalEconomy || '0%',
      economyValue: info.economyValue || 'R$ 0.00',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      requestedBy: info.requestedBy || 'Não informado',
      contractor: info.contractor || 'N/A',
      storeName: info.storeName || 'Fornecedor não informado',
      deliveryMan: info.deliveryMan || 'N/A',
      logisticsInfo: info.logisticsInfo || {
        origin: 'N/A',
        destination: 'N/A',
        distance: '0 KM',
        deliveryStatus: 'PENDENTE',
      },
      applicationNotes: info.applicationNotes || 'Sem notas adicionais.',
    };

    await docRef.set(budgetData);
    return budgetData;
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
      stats: { totalSpent, totalBudgets: budgets.length },
      updatedAt: new Date().toISOString(),
    };
  }

  async getWorkStock(userId: string) {
    const doc = await this.workStockCollection.doc(userId).get();
    return doc.exists ? doc.data() : { items: [] };
  }

  async updateWorkStock(userId: string, items: any[]) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();
    const currentItems = stockDoc.exists ? stockDoc.data().items : [];

    items.forEach((newItem) => {
      const productName = String(newItem.product).toLowerCase().trim();
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

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    const data = await this.getBudgetById(budgetId);
    const userDoc = await this.usersCollection.doc(data.userId).get();
    const userName = userDoc.exists ? userDoc.data().name : 'Responsável';

    return new Promise((resolve) => {
      const doc = new PDFDocument({
        margin: 30,
        size: 'A4',
        layout: 'landscape',
      });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const safeUpper = (val: any) => (val ? String(val).toUpperCase() : 'N/A');

      doc.rect(0, 0, 842, 60).fill('#1A237E');
      doc
        .fillColor('#FFF')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('OBRA JUSTA - RELATÓRIO INTELIGENTE', 40, 22);

      const yInfo = 80;
      doc.fillColor('#1A237E').fontSize(9);

      doc.font('Helvetica-Bold').text('RESPONSÁVEL:', 40, yInfo);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(safeUpper(userName), 130, yInfo);
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('SOLICITANTE:', 40, yInfo + 15);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(safeUpper(data.requestedBy), 130, yInfo + 15);
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('EXECUTOR:', 40, yInfo + 30);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(safeUpper(data.contractor), 130, yInfo + 30);

      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('ID PEDIDO:', 300, yInfo);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(String(data.id || 'N/A'), 380, yInfo);
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('DATA/HORA:', 300, yInfo + 15);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(
          data.createdAt
            ? new Date(data.createdAt).toLocaleString('pt-BR')
            : 'N/A',
          380,
          yInfo + 15,
        );
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('ENTREGADOR:', 300, yInfo + 30);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(safeUpper(data.deliveryMan), 380, yInfo + 30);

      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .text('SAÍDA:', 550, yInfo);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#333')
        .text(data.logisticsInfo?.origin || 'N/A', 620, yInfo, { width: 180 });
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('CHEGADA:', 550, yInfo + 15);
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#333')
        .text(data.logisticsInfo?.destination || 'N/A', 620, yInfo + 15, {
          width: 180,
        });
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('DISTÂNCIA:', 550, yInfo + 30);
      doc
        .font('Helvetica')
        .fillColor('#333')
        .text(data.logisticsInfo?.distance || '0 KM', 620, yInfo + 30);

      const yTable = 140;
      doc.rect(40, yTable, 762, 20).fill('#1A237E');
      doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(8);
      doc.text('DESCRIÇÃO', 45, yTable + 6);
      doc.text('FORNECEDOR', 220, yTable + 6);
      doc.text('MARCA', 350, yTable + 6);
      doc.text('QTD', 440, yTable + 6);
      doc.text('PREÇO UN.', 480, yTable + 6);
      doc.text('ANÁLISE IA', 550, yTable + 6);
      doc.text('% VARIAÇÃO', 650, yTable + 6);
      doc.text('TOTAL', 740, yTable + 6);

      let yRow = yTable + 25;
      (data.items || []).forEach((item: any) => {
        if (yRow > 500) {
          doc.addPage({ layout: 'landscape' });
          yRow = 50;
        }
        doc.fillColor('#333').font('Helvetica').fontSize(8);
        doc.text(safeUpper(item.product), 45, yRow, { width: 170 });
        doc.text(safeUpper(data.storeName), 220, yRow, { width: 120 });
        doc.text(safeUpper(item.brand), 350, yRow, { width: 80 });
        doc.text(String(item.quantity || 0), 440, yRow);
        doc.text(`R$ ${Number(item.price || 0).toFixed(2)}`, 480, yRow);

        const statusColor =
          (item.statusIa || '').toUpperCase() === 'ALTO'
            ? '#D32F2F'
            : '#388E3C';
        doc
          .fillColor(statusColor)
          .font('Helvetica-Bold')
          .text(safeUpper(item.statusIa), 550, yRow);
        doc
          .fillColor('#333')
          .font('Helvetica')
          .text(String(item.variation || '0%'), 650, yRow);
        doc
          .font('Helvetica-Bold')
          .text(`R$ ${Number(item.subtotal || 0).toFixed(2)}`, 740, yRow);

        yRow += 20;
        doc
          .moveTo(40, yRow - 5)
          .lineTo(802, yRow - 5)
          .stroke('#EEE');
      });

      const yFooter = Math.max(yRow + 10, 480);
      doc.rect(40, yFooter, 400, 60).fill('#F5F5F5');
      doc
        .fillColor('#1A237E')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('NOTAS DE APLICAÇÃO:', 50, yFooter + 10);
      doc
        .fillColor('#333')
        .font('Helvetica')
        .fontSize(8)
        .text(data.applicationNotes || 'Sem notas.', 50, yFooter + 25, {
          width: 380,
        });

      doc.rect(500, yFooter, 302, 60).stroke('#1A237E');
      doc.fillColor('#1A237E').font('Helvetica-Bold').fontSize(10);
      doc.text(
        `ECONOMIA TOTAL: ${data.totalEconomy || '0%'} (${data.economyValue || 'R$ 0.00'})`,
        510,
        yFooter + 15,
      );
      doc
        .fontSize(14)
        .text(
          `TOTAL GERAL: R$ ${Number(data.totalValue || 0).toFixed(2)}`,
          510,
          yFooter + 35,
        );

      doc.rect(650, 20, 150, 25).fill('#FFD600');
      doc
        .fillColor('#000')
        .fontSize(10)
        .text(`STATUS: ${safeUpper(data.status)}`, 660, 28, {
          width: 130,
          align: 'center',
        });

      doc.end();
    });
  }
}
