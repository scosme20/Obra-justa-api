// ─── Mock mutável — controlado por teste ─────────────────────────────────
const mockBudgetDocRef = {
  id: 'mock-budget-id',
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
};

// Objetos mutáveis que cada teste pode sobrescrever
const budgetColMock = {
  doc: jest.fn().mockReturnValue(mockBudgetDocRef),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({ docs: [] }),
};

const workStockDocMock = {
  exists: false,
  data: jest.fn().mockReturnValue({}),
  update: jest.fn().mockResolvedValue(undefined),
};

const workStockColMock = {
  doc: jest
    .fn()
    .mockReturnValue({ get: jest.fn().mockResolvedValue(workStockDocMock) }),
};

jest.mock('../config/firebase.config', () => ({
  db: {
    collection: jest.fn().mockImplementation((name: string) => {
      if (name === 'work_stock') return workStockColMock;
      if (name === 'budgets') return budgetColMock;
      return {
        doc: jest.fn().mockReturnValue({ set: jest.fn(), get: jest.fn() }),
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      };
    }),
  },
  getDb: jest.fn(),
}));
// ──────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { NotificationService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';

const mockFinanceService = {
  recordExpense: jest.fn().mockResolvedValue(undefined),
};

describe('InventoryService (Unit)', () => {
  let service: InventoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: FinanceService, useValue: mockFinanceService },
        {
          provide: NotificationService,
          useValue: { notifyPurchaseConfirmed: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve calcular o totalValue corretamente ao criar um orçamento', async () => {
    const items = [
      { product: 'Cimento', price: 30, quantity: 2 },
      { product: 'Areia', price: 100, quantity: 1 },
    ];
    const budget = await service.createBudget(items, 'user-123');
    expect(budget.totalValue).toBe(160);
  });

  it('deve formatar nomes de produtos para minúsculas sem espaços extras', async () => {
    const items = [{ product: '  TIJOLO Baiano  ', price: 10, quantity: 1 }];
    const budget = await service.createBudget(items, 'user-123');
    expect(budget.items[0].product).toBe('tijolo baiano');
  });

  it('deve calcular subtotal de cada item corretamente', async () => {
    const items = [{ product: 'Tinta', price: 80, quantity: 3 }];
    const budget = await service.createBudget(items, 'user-123');
    expect(budget.items[0].subtotal).toBe(240);
  });

  it('deve lançar NotFoundException ao consumir de estoque inexistente', async () => {
    workStockColMock.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({ exists: false }),
    });

    await expect(
      service.consumeFromStock('user-999', 'cimento', 5),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve lançar BadRequestException ao consumir item inexistente no estoque', async () => {
    workStockColMock.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ items: [{ product: 'areia', quantity: 10 }] }),
      }),
      update: jest.fn(),
    });

    await expect(
      service.consumeFromStock('user-123', 'cimento', 5),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve lançar BadRequestException por saldo insuficiente', async () => {
    workStockColMock.doc.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ items: [{ product: 'cimento', quantity: 2 }] }),
      }),
      update: jest.fn(),
    });

    await expect(
      service.consumeFromStock('user-123', 'cimento', 10),
    ).rejects.toThrow(BadRequestException);
  });
});
