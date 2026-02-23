import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('deve calcular o resumo financeiro corretamente', async () => {
    const mockTransactions = [
      { amount: 100, category: 'MATERIAL' },
      { amount: 50, category: 'FREIGHT' },
      { amount: 200, category: 'MATERIAL' },
    ];

    jest.spyOn(service, 'getWorkSummary').mockResolvedValue({
      totalSpent: 350,
      byCategory: { MATERIAL: 300, FREIGHT: 50, LABOR: 0, OTHER: 0 },
      count: 3,
    });

    const summary = await service.getWorkSummary('user-123');
    expect(summary.totalSpent).toBe(350);
    expect(summary.byCategory.MATERIAL).toBe(300);
  });
});
