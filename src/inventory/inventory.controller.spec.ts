import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('InventoryController', () => {
  let controller: InventoryController;

  const mockInventoryService = {
    createBudget: jest.fn().mockResolvedValue({ id: '1' }),
    getAllBudgets: jest.fn().mockResolvedValue([]),
    addToWorkStock: jest.fn().mockResolvedValue({}),
    generateBudgetPDF: jest.fn().mockResolvedValue(Buffer.from([])),
    getUserDashboard: jest.fn().mockResolvedValue({ stats: {} }),
    getProductAverage: jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: mockInventoryService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
