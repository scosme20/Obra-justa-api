import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AiStockService } from '../ai/ai-stock.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateBudgetDto, ConsumeStockDto } from './dto/inventory.dto';

describe('InventoryController (Integration)', () => {
  let controller: InventoryController;
  let inventoryService: jest.Mocked<Partial<InventoryService>>;

  const mockReq = { user: { userId: 'user-123' } };

  beforeEach(async () => {
    inventoryService = {
      createBudget: jest
        .fn()
        .mockResolvedValue({ id: 'doc-123', status: 'OPEN' }),
      getAllBudgets: jest.fn().mockResolvedValue([{ id: 'doc-123' }]),
      getUserDashboard: jest
        .fn()
        .mockResolvedValue({ stats: { totalSpent: 1000 } }),
      addToWorkStock: jest.fn().mockResolvedValue({ success: true }),
      generateBudgetPDF: jest.fn().mockResolvedValue(Buffer.from([])),
      consumeFromStock: jest
        .fn()
        .mockResolvedValue({ success: true, remaining: 5 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
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
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('POST /budget deve chamar createBudget com dto e userId', async () => {
    const body: CreateBudgetDto = {
      items: [{ product: 'Cimento', quantity: 10, price: 30 }],
      requestedBy: 'João',
      contractor: 'Mestre José',
      storeName: 'Loja Construir',
    };

    const result = await controller.create(mockReq, body);

    expect(result.id).toBe('doc-123');
    expect(inventoryService.createBudget).toHaveBeenCalledWith(
      body,
      'user-123',
    );
  });

  it('GET /budgets deve chamar getAllBudgets com userId do token', async () => {
    const result = await controller.findAll(mockReq);

    expect(Array.isArray(result)).toBe(true);
    expect(inventoryService.getAllBudgets).toHaveBeenCalledWith('user-123');
  });

  it('GET /dashboard deve retornar estatísticas do usuário', async () => {
    const result = await controller.getDashboard(mockReq);

    expect(result.stats.totalSpent).toBe(1000);
    expect(inventoryService.getUserDashboard).toHaveBeenCalledWith('user-123');
  });

  it('POST /stock/consume deve chamar consumeFromStock com os dados corretos', async () => {
    const body: ConsumeStockDto = { product: 'cimento', quantity: 3 };

    const result = await controller.consume(mockReq, body);

    expect(result.success).toBe(true);
    expect(inventoryService.consumeFromStock).toHaveBeenCalledWith(
      'user-123',
      'cimento',
      3,
    );
  });
});
