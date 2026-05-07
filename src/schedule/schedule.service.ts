import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../config/firebase.config';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class ScheduleService {
  private scheduleCollection = db.collection('schedules');
  private productsCollection = db.collection('products');
  private expensesCollection = db.collection('expenses');
  private inventoryCollection = db.collection('inventory');
  private groq: Groq;

  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async getMySchedule(userId: string) {
    const snapshot = await this.scheduleCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as any;
  }

  async updateTaskStatus(userId: string, taskId: string, status: string) {
    const schedule = await this.getMySchedule(userId);
    if (!schedule) throw new NotFoundException('Cronograma não encontrado');

    const tasks = schedule.tasks.map((t: any) =>
      t.id === taskId
        ? {
            ...t,
            status: status.toUpperCase(),
            updatedAt: new Date().toISOString(),
          }
        : t,
    );

    await this.scheduleCollection.doc(schedule.id).update({ tasks });
    return { success: true, taskId, newStatus: status.toUpperCase() };
  }
  async addRealExpense(
    userId: string,
    taskId: string,
    amount: number,
    description: string,
  ) {
    const expenseRef = this.expensesCollection.doc();
    await expenseRef.set({
      id: expenseRef.id,
      userId,
      taskId,
      amount,
      description,
      date: new Date().toISOString(),
    });
    return { success: true };
  }

  async getBudgetComparison(userId: string) {
    const schedule = await this.getMySchedule(userId);
    if (!schedule) throw new NotFoundException('Cronograma não encontrado');

    const expensesSnapshot = await this.expensesCollection
      .where('userId', '==', userId)
      .get();
    const realExpenses = expensesSnapshot.docs.map((doc) => doc.data());

    return schedule.tasks.map((task: any) => {
      const totalSpent = realExpenses
        .filter((exp) => exp.taskId === task.id)
        .reduce((sum, exp) => sum + exp.amount, 0);

      const difference = task.estimatedCost - totalSpent;

      return {
        taskId: task.id,
        taskTitle: task.title,
        estimated: task.estimatedCost,
        real: totalSpent,
        difference,
        isOverBudget: difference < 0,
        percentage:
          task.estimatedCost > 0 ? (totalSpent / task.estimatedCost) * 100 : 0,
      };
    });
  }
  async getCashFlow(userId: string) {
    const schedule = await this.getMySchedule(userId);
    if (!schedule) throw new NotFoundException('Cronograma não encontrado');

    const projection: Record<string, number> = {};

    for (const task of schedule.tasks) {
      const monthYear = task.startDate.substring(0, 7);
      let taskTotal = task.estimatedCost || 0;

      if (task.requiredItems?.length > 0) {
        let marketValue = 0;
        for (const item of task.requiredItems) {
          const avgPrice = await this.getAverageMarketPrice(item.name);
          marketValue +=
            (avgPrice || item.estimatedUnitPrice || 0) * (item.quantity || 1);
        }
        if (marketValue > 0) taskTotal = marketValue;
      }
      projection[monthYear] = (projection[monthYear] || 0) + taskTotal;
    }

    return Object.keys(projection)
      .sort()
      .map((month) => ({ month, estimatedOutflow: projection[month] }));
  }

  private async getAverageMarketPrice(
    productName: string,
  ): Promise<number | null> {
    const snapshot = await this.productsCollection
      .where('name', '>=', productName)
      .where('name', '<=', productName + '\uf8ff')
      .get();

    if (snapshot.empty) return null;
    const prices = snapshot.docs
      .map((doc) => doc.data().price)
      .filter((p) => p > 0);
    return prices.length > 0
      ? prices.reduce((a, b) => a + b, 0) / prices.length
      : null;
  }

  async getAISavingSuggestions(userId: string) {
    const schedule = await this.getMySchedule(userId);
    const comparison = await this.getBudgetComparison(userId);
    const deficit = comparison
      .filter((c) => c.isOverBudget)
      .reduce((s, c) => s + Math.abs(c.difference), 0);

    if (deficit === 0) return { message: 'Orçamento em dia!' };

    const futureTasks = schedule.tasks.filter(
      (t: any) => t.status !== 'COMPLETED',
    );

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Engenheiro de Custos: Sugira cortes em materiais de acabamento para compensar R$ ${deficit}. Retorne JSON.`,
        },
        {
          role: 'user',
          content: `Obra: ${schedule.description}. Fases: ${JSON.stringify(futureTasks)}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  }

  async getStockAlerts(userId: string) {
    const schedule = await this.getMySchedule(userId);
    const inventorySnapshot = await this.inventoryCollection.doc(userId).get();
    const stock = inventorySnapshot.data()?.items || [];

    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 15);

    return schedule.tasks
      .filter(
        (t: any) =>
          new Date(t.startDate) <= horizon && t.status !== 'COMPLETED',
      )
      .flatMap((t: any) =>
        (t.requiredItems || []).map((req: any) => {
          const inStock =
            stock.find(
              (i: any) => i.name.toLowerCase() === req.name.toLowerCase(),
            )?.quantity || 0;
          return inStock < req.quantity
            ? {
                task: t.title,
                item: req.name,
                missing: req.quantity - inStock,
                deadline: t.startDate,
              }
            : null;
        }),
      )
      .filter((a) => a !== null);
  }
  async generateAutoSchedule(userId: string, description: string) {
    const today = new Date().toISOString().split('T')[0];
    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Engenheiro Civil: Gere cronograma técnico JSON. Datas YYYY-MM-DD. Liste 'requiredItems' (name, quantity, estimatedUnitPrice).`,
        },
        { role: 'user', content: `Projeto: ${description}` },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const schedule = JSON.parse(
      completion.choices[0]?.message?.content || '{}',
    );
    const docRef = this.scheduleCollection.doc();
    const data = {
      id: docRef.id,
      userId,
      description,
      title: schedule.title,
      tasks: schedule.phases || [],
      createdAt: new Date().toISOString(),
      generatedByAi: true,
    };
    await docRef.set(data);
    return { success: true, schedule: data };
  }

  async handleDelay(userId: string, taskId: string, days: number) {
    const schedule = await this.getMySchedule(userId);
    const tasks = schedule.tasks.map((t: any) => {
      if (t.id !== taskId && !t.dependsOn?.includes(taskId)) return t;
      const shift = (date: string) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      };
      return {
        ...t,
        startDate: shift(t.startDate),
        endDate: shift(t.endDate),
        delayed: true,
      };
    });
    await this.scheduleCollection
      .doc(schedule.id)
      .update({ tasks, lastUpdated: new Date().toISOString() });
    return { success: true };
  }
}
