// ─── Mocks — devem preceder todos os imports ──────────────────────────────
jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({ title: 'Obra Teste', phases: [] }),
              },
            },
          ],
        }),
      },
    },
  })),
}));

// Mock mutável para scheduleCollection
const scheduleDocMock = {
  id: 'sched-001',
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
};

const scheduleColMock = {
  doc: jest.fn().mockReturnValue(scheduleDocMock),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
};

const expensesDocMock = {
  id: 'exp-001',
  set: jest.fn().mockResolvedValue(undefined),
};

const expensesColMock = {
  doc: jest.fn().mockReturnValue(expensesDocMock),
  where: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ docs: [] }),
};

jest.mock('../config/firebase.config', () => ({
  db: {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'schedules') return scheduleColMock;
      if (name === 'expenses') return expensesColMock;
      return {
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: false,
            data: () => ({ items: [] }),
          }),
        }),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      };
    }),
  },
  getDb: jest.fn(),
}));
// ──────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

const mockScheduleData = {
  userId: 'user-123',
  description: 'Reforma sala',
  tasks: [
    {
      id: 'task-1',
      title: 'Fundação',
      startDate: '2026-05-01',
      endDate: '2026-05-15',
      status: 'PENDING',
      estimatedCost: 5000,
      dependsOn: [],
    },
    {
      id: 'task-2',
      title: 'Alvenaria',
      startDate: '2026-05-16',
      endDate: '2026-06-01',
      status: 'PENDING',
      estimatedCost: 8000,
      dependsOn: ['task-1'],
    },
  ],
};

const mockDocWithRef = {
  id: 'sched-001',
  ref: scheduleDocMock,
  data: () => mockScheduleData,
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  const mockConfigService = { get: jest.fn().mockReturnValue('fake_groq_key') };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset collection mock defaults
    scheduleColMock.get.mockResolvedValue({ empty: true, docs: [] });
    scheduleColMock.where.mockReturnThis();
    scheduleColMock.orderBy.mockReturnThis();
    scheduleColMock.limit.mockReturnThis();
    scheduleColMock.doc.mockReturnValue(scheduleDocMock);
    expensesColMock.doc.mockReturnValue(expensesDocMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve retornar null quando usuário não tem cronograma', async () => {
    scheduleColMock.get.mockResolvedValueOnce({ empty: true, docs: [] });
    const result = await service.getMySchedule('user-sem-agenda');
    expect(result).toBeNull();
  });

  it('deve retornar o cronograma ativo do usuário', async () => {
    scheduleColMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [mockDocWithRef],
    });
    const result = await service.getMySchedule('user-123');
    expect(result.id).toBe('sched-001');
    expect(result.tasks).toHaveLength(2);
  });

  it('handleDelay deve lançar NotFoundException se não há cronograma', async () => {
    scheduleColMock.get.mockResolvedValueOnce({ empty: true, docs: [] });
    await expect(service.handleDelay('user-xyz', 'task-1', 5)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('handleDelay deve propagar atraso para tarefas dependentes', async () => {
    scheduleColMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [mockDocWithRef],
    });
    const result = await service.handleDelay('user-123', 'task-1', 7);
    expect(result.success).toBe(true);
    expect(result.tasksAffected).toBeGreaterThan(0); // task-1 e task-2 (dependente)
    expect(scheduleDocMock.update).toHaveBeenCalled();
  });

  it('updateTaskStatus deve lançar NotFoundException se cronograma não existe', async () => {
    scheduleColMock.get.mockResolvedValueOnce({ empty: true, docs: [] });
    await expect(
      service.updateTaskStatus('user-xyz', 'task-1', 'COMPLETED'),
    ).rejects.toThrow(NotFoundException);
  });

  it('addRealExpense deve salvar despesa com os dados corretos', async () => {
    await service.addRealExpense('user-123', 'task-1', 1500, 'Compra cimento');
    expect(expensesDocMock.set).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        taskId: 'task-1',
        amount: 1500,
        description: 'Compra cimento',
      }),
    );
  });

  it('generateAutoSchedule deve chamar GROQ e salvar cronograma no Firestore', async () => {
    const result = await service.generateAutoSchedule(
      'user-123',
      'Construção de casa',
    );
    expect(result.success).toBe(true);
    expect(result.schedule.userId).toBe('user-123');
    expect(result.schedule.generatedByAi).toBe(true);
    expect(scheduleDocMock.set).toHaveBeenCalled();
  });
});
