// ─── Mock antes dos imports ────────────────────────────────────────────────
jest.mock('../config/firebase.config', () => {
  const col = {
    doc: jest.fn().mockReturnValue({
      id: 'mock-expense-id',
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ exists: false }),
    }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
  };
  return {
    db: { collection: jest.fn().mockReturnValue(col) },
    getDb: jest.fn(),
  };
});
// ──────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';
import { db } from '../config/firebase.config';

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve calcular o resumo financeiro corretamente (via mock do método)', async () => {
    jest.spyOn(service, 'getWorkSummary').mockResolvedValue({
      totalSpent: 350,
      byCategory: { MATERIAL: 300, FREIGHT: 50, LABOR: 0, OTHER: 0 },
      count: 3,
    });

    const summary = await service.getWorkSummary('user-123');
    expect(summary.totalSpent).toBe(350);
    expect(summary.byCategory.MATERIAL).toBe(300);
    expect(summary.byCategory.FREIGHT).toBe(50);
    expect(summary.count).toBe(3);
  });

  it('deve chamar Firestore ao registrar uma despesa', async () => {
    await service.recordExpense('user-123', {
      amount: 500,
      category: 'MATERIAL',
      description: 'Compra de cimento',
      relatedId: 'budget-abc',
    });

    expect(db.collection).toHaveBeenCalled();
  });

  it('deve retornar resumo zerado quando não há despesas', async () => {
    const col = (db.collection as jest.Mock).mock.results[0]?.value;
    if (col) {
      col.where.mockReturnThis();
      col.get.mockResolvedValueOnce({ empty: true, docs: [] });
    }

    const summary = await service.getWorkSummary('user-sem-dados');
    expect(summary.totalSpent).toBe(0);
    expect(summary.count).toBe(0);
  });
});
