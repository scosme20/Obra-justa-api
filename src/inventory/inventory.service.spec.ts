import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { FinanceService } from '../finance/finance.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let financeService: FinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: FinanceService,
          useValue: {
            recordExpense: jest.fn().mockResolvedValue({ id: 'exp-123' }),
          },
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    financeService = module.get<FinanceService>(FinanceService);
  });

  it('deve registrar uma despesa ao criar um orçamento', async () => {
    const items = [
      { product: 'Areia', quantity: 5, price: 100, subtotal: 500 },
    ];

    await service.createBudget('user-test-123', items as any);

    expect(financeService.recordExpense).toHaveBeenCalled();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });
});
