import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AiStockService } from '../ai/ai-stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('InventoryController (Integration)', () => {
  let controller: InventoryController;
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            createBudget: jest.fn().mockResolvedValue({
              id: 'doc-123',
              status: 'OPEN',
            }),
            getUserDashboard: jest.fn().mockResolvedValue({
              stats: { totalSpent: 1000 },
            }),
          },
        },
        {
          provide: AiStockService,
          useValue: { analyzeStockHealth: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('POST /inventory/budget deve chamar o service com os parâmetros corretos', async () => {
    const body = {
      items: [{ product: 'Cimento', quantity: 10 }],
      requestedBy: 'Teste',
      contractor: 'Contratante Teste',
      storeName: 'Loja Teste',
    };
    const req = { user: { userId: 'user-123' } };

    const result = await controller.create(req, body);

    expect(result.id).toBe('doc-123');
    expect(service.createBudget).toHaveBeenCalledWith(body, 'user-123');
  });
});
