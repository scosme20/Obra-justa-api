import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../config/firebase.config';
import * as PDFDocument from 'pdfkit';
import { FinanceService } from '../finance/finance.service';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');
  private workStockCollection = db.collection('work_stock');

  constructor(
    private readonly financeService: FinanceService,
    private readonly notificationService: NotificationService,
  ) {}

  async createBudget(dataOrItems: any, userId: string, extraInfo: any = {}) {
    const docRef = this.budgetsCollection.doc();

    const itemsRaw = Array.isArray(dataOrItems)
      ? dataOrItems
      : dataOrItems.items || [];
    const info = Array.isArray(dataOrItems) ? extraInfo : dataOrItems;

    const mappedItems = itemsRaw.map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      return {
        ...item,
        product: String(item.product || 'Sem nome')
          .toLowerCase()
          .trim(),
        brand: item.brand || 'N/A',
        statusIa: (item.statusIa || item.status || 'NA MÉDIA').toUpperCase(),
        variation: item.variation || '0%',
        price,
        quantity,
        subtotal: price * quantity,
      };
    });

    const totalValue = mappedItems.reduce((sum, i) => sum + i.subtotal, 0);

    const budgetData = {
      id: docRef.id,
      userId,
      items: mappedItems,
      totalValue,
      totalEconomy: info.totalEconomy || '0%',
      economyValue: info.economyValue || 'R$ 0.00',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
      requestedBy: info.requestedBy || 'Não informado',
      contractor: info.contractor || 'N/A',
      storeName: info.storeName || 'Fornecedor não informado',
      deliveryMan: info.deliveryMan || 'N/A',
      logisticsInfo: {
        origin: info.logisticsInfo?.origin || 'N/A',
        destination: info.logisticsInfo?.destination || 'N/A',
        distance: info.logisticsInfo?.distance || '0 KM',
        deliveryStatus: info.logisticsInfo?.deliveryStatus || 'PENDENTE',
      },
      applicationNotes: info.applicationNotes || 'Sem notas adicionais.',
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getWorkStock(userId: string) {
    const doc = await this.workStockCollection.doc(userId).get();
    return doc.exists ? doc.data() : { items: [], lastUpdate: null };
  }

  async updateWorkStock(userId: string, items: any[]) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();
    const currentItems: any[] = stockDoc.exists ? stockDoc.data().items : [];

    items.forEach((newItem) => {
      const productName = String(newItem.product).toLowerCase().trim();
      const existingIndex = currentItems.findIndex(
        (i) => i.product === productName,
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

  async consumeFromStock(userId: string, product: string, quantity: number) {
    const stockRef = this.workStockCollection.doc(userId);
    const stockDoc = await stockRef.get();

    if (!stockDoc.exists)
      throw new NotFoundException('Estoque não encontrado.');

    const items: any[] = stockDoc.data().items || [];
    const productName = product.toLowerCase().trim();
    const itemIndex = items.findIndex((i) => i.product === productName);

    if (itemIndex === -1)
      throw new BadRequestException(
        `O item "${product}" não existe no seu estoque.`,
      );
    if (items[itemIndex].quantity < quantity) {
      throw new BadRequestException(
        `Saldo insuficiente. Disponível: ${items[itemIndex].quantity}. Tentativa: ${quantity}`,
      );
    }

    items[itemIndex].quantity -= Number(quantity);
    items[itemIndex].updatedAt = new Date().toISOString();

    await stockRef.update({ items, lastUpdate: new Date().toISOString() });
    return {
      success: true,
      remaining: items[itemIndex].quantity,
      product: productName,
    };
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

  async addToWorkStock(userId: string, budgetId: string) {
    const budget = await this.getBudgetById(budgetId);
    if (budget.status === 'PURCHASED')
      throw new BadRequestException('Já processado.');

    await this.updateWorkStock(userId, budget.items);
    await this.financeService.recordExpense(userId, {
      amount: budget.totalValue,
      category: 'MATERIAL',
      description: `Compra - Orçamento ${budgetId}`,
      relatedId: budgetId,
    });
    await this.budgetsCollection.doc(budgetId).update({ status: 'PURCHASED' });

    // Notifica confirmação da compra
    await this.notificationService.notifyPurchaseConfirmed(
      userId,
      budgetId,
      budget.totalValue,
    );

    return { success: true };
  }

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    const budget = await this.getBudgetById(budgetId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Cabeçalho ──────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').text('Obra Justa', 40, 40);
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#666')
        .text('Orçamento de Materiais', 40, 68);

      doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#e0e0e0').stroke();

      // ── Metadados ──────────────────────────────────────────────────────
      doc.fillColor('#111').fontSize(9).font('Helvetica');
      const meta = [
        ['Nº do Orçamento', budget.id],
        ['Solicitado por', budget.requestedBy],
        ['Empreiteiro', budget.contractor],
        ['Fornecedor', budget.storeName],
        ['Data', new Date(budget.createdAt).toLocaleDateString('pt-BR')],
        ['Status', budget.status],
      ];
      let y = 100;
      meta.forEach(([label, value]) => {
        doc
          .font('Helvetica-Bold')
          .text(`${label}:`, 40, y, { continued: true });
        doc.font('Helvetica').text(` ${value}`);
        y += 16;
      });

      // ── Tabela de itens ─────────────────────────────────────────────────
      y += 10;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#e0e0e0').stroke();
      y += 8;

      const cols = {
        product: 40,
        qty: 240,
        price: 310,
        subtotal: 420,
        status: 490,
      };

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
      doc.text('Produto', cols.product, y);
      doc.text('Qtd', cols.qty, y);
      doc.text('Preço Unit.', cols.price, y);
      doc.text('Subtotal', cols.subtotal, y);
      doc.text('Status IA', cols.status, y);
      y += 14;

      doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
      y += 6;

      doc.font('Helvetica').fillColor('#111').fontSize(8.5);
      (budget.items || []).forEach((item: any, idx: number) => {
        if (idx % 2 === 0) {
          doc
            .rect(40, y - 2, 515, 14)
            .fillColor('#f9f9f9')
            .fill();
        }
        doc.fillColor('#111');
        doc.text(String(item.product).toUpperCase(), cols.product, y, {
          width: 190,
        });
        doc.text(String(item.quantity), cols.qty, y);
        doc.text(`R$ ${Number(item.price).toFixed(2)}`, cols.price, y);
        doc.text(`R$ ${Number(item.subtotal).toFixed(2)}`, cols.subtotal, y);

        const statusColor =
          item.statusIa === 'CARO'
            ? '#c0392b'
            : item.statusIa === 'BARATO'
              ? '#27ae60'
              : '#f39c12';
        doc.fillColor(statusColor).text(item.statusIa || '-', cols.status, y);
        doc.fillColor('#111');
        y += 16;

        if (y > 730) {
          doc.addPage();
          y = 40;
        }
      });

      // ── Total ───────────────────────────────────────────────────────────
      y += 4;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#ccc').stroke();
      y += 10;
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`Total: R$ ${Number(budget.totalValue).toFixed(2)}`, 400, y, {
          align: 'right',
          width: 155,
        });

      if (budget.economyValue && budget.economyValue !== 'R$ 0.00') {
        y += 16;
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#27ae60')
          .text(
            `Economia estimada: ${budget.economyValue} (${budget.totalEconomy})`,
            400,
            y,
            { align: 'right', width: 155 },
          );
      }

      // ── Rodapé ──────────────────────────────────────────────────────────
      doc
        .fillColor('#999')
        .fontSize(8)
        .font('Helvetica')
        .text('Gerado por Obra Justa API', 40, 790, {
          align: 'center',
          width: 515,
        });

      doc.end();
    });
  }
}
