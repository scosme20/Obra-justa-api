import { Injectable, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '../config/firebase.config';
import Groq from 'groq-sdk';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class ScheduleService implements OnModuleInit {
  private scheduleCollection = db.collection('schedules');
  private groq: Groq;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.groq = new Groq({ apiKey: this.configService.get('GROQ_API_KEY') });
  }

  async addTask(userId: string, data: CreateTaskDto) {
    const docRef = this.scheduleCollection.doc();
    const newTask = {
      id: docRef.id,
      userId,
      ...data,
      status: data.status || 'PENDING',
      createdAt: new Date().toISOString(),
    };
    await docRef.set(newTask);
    return newTask;
  }

  async getMySchedule(userId: string) {
    const snapshot = await this.scheduleCollection
      .where('userId', '==', userId)
      .get();
    return snapshot.docs
      .map((doc) => doc.data())
      .sort(
        (a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
  }

  async getTaskResources(userId: string, taskId: string) {
    const taskDoc = await this.scheduleCollection.doc(taskId).get();
    if (!taskDoc.exists || taskDoc.data().userId !== userId) {
      throw new ForbiddenException('Tarefa não encontrada.');
    }
    const task = taskDoc.data();

    const profiles = await db
      .collection('profiles')
      .where('active', '==', true)
      .limit(5)
      .get();

    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'És um assistente de compras de construção. Sugere materiais e profissionais.',
        },
        {
          role: 'user',
          content: `Para a tarefa "${task.title}", o que preciso de comprar e quem devo contratar? Contexto: ${JSON.stringify(profiles.docs.map((d) => d.data().specialty))}`,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0]?.message?.content);
  }

  async generateAutoSchedule(userId: string, description: string) {
    const completion = await this.groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Gera um cronograma de obra em JSON: {"tasks": [...]}',
        },
        { role: 'user', content: `Cria um plano para: ${description}` },
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
    });

    const { tasks } = JSON.parse(completion.choices[0]?.message?.content);
    const batch = db.batch();
    const createdTasks = tasks.map((t) => {
      const ref = this.scheduleCollection.doc();
      const data = {
        id: ref.id,
        userId,
        ...t,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      batch.set(ref, data);
      return data;
    });

    await batch.commit();
    return { message: 'Plano gerado com sucesso', tasks: createdTasks };
  }
}
