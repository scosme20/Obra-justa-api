import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { FinanceService } from '../finance/finance.service';

describe('InventoryService (Unit)', () => {
  let service: InventoryService;

  const mockFinanceService = {
    recordExpense: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: FinanceService, useValue: mockFinanceService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('deve calcular o totalValue corretamente ao criar um orçamento', async () => {
    const items = [
      { product: 'Cimento', price: 30, quantity: 2 },
      { product: 'Areia', price: 100, quantity: 1 },
    ];

    // Testamos a lógica interna de soma
    const budget = await service.createBudget(items, 'user-123');

    expect(budget.totalValue).toBe(160); // (30*2) + (100*1)
  });

  it('deve formatar nomes de produtos para minúsculas e sem espaços', async () => {
    const items = [{ product: '  TIJOLO Baiano  ', price: 10, quantity: 1 }];
    const budget = await service.createBudget(items, 'user-123');

    expect(budget.items[0].product).toBe('tijolo baiano');
  });
});
