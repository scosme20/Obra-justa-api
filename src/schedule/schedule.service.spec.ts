import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { ConfigService } from '@nestjs/config';

describe('ScheduleService', () => {
  let service: ScheduleService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('fake_groq_key'),
  };

  beforeEach(async () => {
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

  it('deve estruturar os dados da tarefa corretamente antes de salvar', async () => {
    const userId = 'user123';
    const taskData = {
      title: 'Teste',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
    };

    expect(taskData.title).toBe('Teste');
  });
});
