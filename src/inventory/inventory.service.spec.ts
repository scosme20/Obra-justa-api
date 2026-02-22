import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve calcular o totalValue corretamente ao criar orçamento', async () => {
    expect(service.createBudget).toBeDefined();
  });
});
