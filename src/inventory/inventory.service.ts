import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../config/firebase.config';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InventoryService {
  private budgetsCollection = db.collection('budgets');

  async getBudgetById(id: string) {
    const doc = await this.budgetsCollection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Orçamento não encontrado');
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : data.createdAt,
    } as any;
  }

  async createBudget(items: any[], userId: string) {
    const docRef = this.budgetsCollection.doc();
    const budgetData = {
      id: docRef.id,
      userId,
      items: items.map((item) => ({
        ...item,
        product: item.product.toLowerCase().trim(),
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        category: item.category || 'Outros',
        subtotal: (Number(item.quantity) || 1) * (Number(item.price) || 0),
      })),
      totalValue: items.reduce(
        (sum, item) =>
          sum + (Number(item.quantity) || 1) * (Number(item.price) || 0),
        0,
      ),
      totalItems: items.length,
      createdAt: new Date(),
    };

    await docRef.set(budgetData);
    return budgetData;
  }

  async getAllBudgets(userId: string, limit: number = 20, search?: string) {
    const query = this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(Number(limit));

    const snapshot = await query.get();
    let budgets = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      } as any;
    });

    if (search) {
      const term = search.toLowerCase();
      budgets = budgets.filter((b: any) =>
        b.items?.some((item: any) => item.product.toLowerCase().includes(term)),
      );
    }
    return budgets;
  }

  async generateBudgetPDF(budgetId: string): Promise<Buffer> {
    const data = await this.getBudgetById(budgetId);
    const userId = data.userId;

    return new Promise(async (resolve) => {
      const pdfDoc = new PDFDocument({ margin: 50 });
      const chunks = [];

      pdfDoc.on('data', (chunk) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));

      // Cabeçalho Profissional
      pdfDoc
        .fillColor('#2c3e50')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('CONSTRUTORA MESTRE DE OBRA', { align: 'left' });
      pdfDoc
        .fontSize(10)
        .fillColor('#7f8c8d')
        .text('Relatório Profissional de Aquisição de Materiais', {
          align: 'left',
        });
      pdfDoc.moveDown();
      pdfDoc.rect(50, 100, 500, 2).fill('#3498db');
      pdfDoc.moveDown(2);

      pdfDoc.fillColor('black').font('Helvetica').fontSize(10);
      pdfDoc.text(`Responsável: ${userId.toUpperCase()}`);
      pdfDoc.text(`Protocolo: ${budgetId}`);
      const dateStr =
        data.createdAt?.toLocaleDateString('pt-BR') ||
        new Date().toLocaleDateString('pt-BR');
      pdfDoc.text(`Data de Emissão: ${dateStr}`);
      pdfDoc.moveDown();

      // Tabela
      pdfDoc
        .font('Helvetica-Bold')
        .text('Item / Categoria', 50, pdfDoc.y, { continued: true });
      pdfDoc.text('Análise', 300, pdfDoc.y, { continued: true });
      pdfDoc.text('Subtotal', 480, pdfDoc.y, { align: 'right' });
      pdfDoc.moveDown(0.5);
      pdfDoc.path('M 50 ' + pdfDoc.y + ' L 550 ' + pdfDoc.y).stroke('#ecf0f1');
      pdfDoc.moveDown();

      for (const item of data.items) {
        const startY = pdfDoc.y;
        pdfDoc
          .fillColor('black')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`${item.product.toUpperCase()}`, 50, startY);
        pdfDoc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#7f8c8d')
          .text(item.category, 50, startY + 12);

        const avgPrice = await this.getProductAverage(userId, item.product);
        let statusText = 'NA MÉDIA',
          statusColor = '#f1c40f';
        if (avgPrice > 0) {
          if (item.price < avgPrice * 0.95) {
            statusText = 'ECONOMIA';
            statusColor = '#27ae60';
          } else if (item.price > avgPrice * 1.05) {
            statusText = 'ACIMA DA MÉDIA';
            statusColor = '#e74c3c';
          }
        }

        pdfDoc.rect(300, startY, 80, 15).fill(statusColor);
        pdfDoc
          .fillColor('white')
          .font('Helvetica-Bold')
          .fontSize(7)
          .text(statusText, 300, startY + 4, { width: 80, align: 'center' });
        pdfDoc
          .fillColor('black')
          .font('Helvetica-Bold')
          .fontSize(10)
          .text(`R$ ${item.subtotal.toFixed(2)}`, 450, startY, {
            align: 'right',
          });
        pdfDoc.moveDown(1.5);
      }

      pdfDoc.moveDown();
      pdfDoc.rect(350, pdfDoc.y, 200, 30).fill('#2c3e50');
      pdfDoc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text(`TOTAL: R$ ${data.totalValue.toFixed(2)}`, 360, pdfDoc.y - 20, {
          width: 180,
          align: 'center',
        });
      pdfDoc.end();
    });
  }

  async generateBudgetExcel(budgetId: string): Promise<Buffer> {
    const data = await this.getBudgetById(budgetId);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orçamento');
    worksheet.columns = [
      { header: 'Produto', key: 'product', width: 30 },
      { header: 'Categoria', key: 'category', width: 15 },
      { header: 'Quantidade', key: 'quantity', width: 10 },
      { header: 'Preço Un.', key: 'price', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
    ];
    data.items.forEach((item) => worksheet.addRow(item));
    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getUserDashboard(userId: string, month?: number, year?: number) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();

    const budgets = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate()
            : data.createdAt,
        } as any;
      })
      .filter((b: any) => {
        if (!month || !year) return true;
        const date = new Date(b.createdAt);
        return (
          date.getMonth() + 1 === Number(month) &&
          date.getFullYear() === Number(year)
        );
      });

    const totalSpent = budgets.reduce(
      (sum, b: any) => sum + (Number(b.totalValue) || 0),
      0,
    );
    const categoryTotals = {};
    budgets.forEach((budget: any) => {
      budget.items?.forEach((item) => {
        const cat = item.category || 'Outros';
        categoryTotals[cat] =
          (categoryTotals[cat] || 0) + (Number(item.subtotal) || 0);
      });
    });

    const chartData = Object.keys(categoryTotals).map((category) => ({
      name: category,
      value: Number(categoryTotals[category].toFixed(2)),
      percentage:
        totalSpent > 0
          ? Number(((categoryTotals[category] / totalSpent) * 100).toFixed(1))
          : 0,
    }));

    return {
      userId,
      periodo: month && year ? `${month}/${year}` : 'Total Acumulado',
      stats: {
        totalSpent: Number(totalSpent.toFixed(2)),
        totalBudgets: budgets.length,
        averageBudget:
          budgets.length > 0
            ? Number((totalSpent / budgets.length).toFixed(2))
            : 0,
      },
      chartData,
      updatedAt: new Date().toISOString(),
    };
  }

  async getCategoryReport(userId: string, category: string) {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .get();
    const allItems = [];
    let categoryTotal = 0;

    snapshot.docs.forEach((doc) => {
      const budget = doc.data();
      const filtered =
        budget.items?.filter(
          (i) => i.category?.toLowerCase() === category.toLowerCase(),
        ) || [];
      filtered.forEach((item) => {
        categoryTotal += item.subtotal;
        allItems.push({
          ...item,
          budgetId: doc.id,
          date: budget.createdAt?.toDate
            ? budget.createdAt.toDate().toISOString()
            : budget.createdAt,
        });
      });
    });

    return {
      userId,
      category,
      totalSpentInCategory: categoryTotal,
      history: allItems.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }

  async getProductAverage(
    userId: string,
    productName: string,
  ): Promise<number> {
    const snapshot = await this.budgetsCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    let total = 0,
      count = 0;
    snapshot.docs.forEach((doc) => {
      const match = doc
        .data()
        .items?.find((i) => i.product === productName.toLowerCase().trim());
      if (match) {
        total += match.price;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }

  async deleteBudget(id: string) {
    await this.getBudgetById(id);
    await this.budgetsCollection.doc(id).delete();
    return { message: 'Orçamento removido', id };
  }
}
