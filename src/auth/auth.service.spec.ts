// ─── Mock antes dos imports ───────────────────────────────────────────────
const mockUserDocRef = {
  id: 'new-user-id',
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
};

const mockUsersQuery = {
  where: jest.fn().mockReturnThis(),
  get: jest.fn(),
  doc: jest.fn().mockReturnValue(mockUserDocRef),
};

jest.mock('../config/firebase.config', () => ({
  db: {
    collection: jest.fn().mockImplementation(() => mockUsersQuery),
  },
  getDb: jest.fn(),
}));
// ─────────────────────────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake_token'),
    verify: jest.fn(),
  };
  const mockConfigService = { get: jest.fn().mockReturnValue('fake_secret') };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUsersQuery.where.mockReturnValue({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    mockUsersQuery.doc.mockReturnValue(mockUserDocRef);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve lançar UnauthorizedException quando e-mail não existe', async () => {
    mockUsersQuery.where.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });

    await expect(
      service.validateUser({ email: 'naoexiste@test.com', password: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve retornar token ao fazer login', async () => {
    const result = await service.login({
      id: 'u1',
      email: 'test@test.com',
      name: 'Teste',
    });

    expect(result.access_token).toBe('fake_token');
    expect(result.refresh_token).toBe('fake_token');
    expect(result.user.email).toBe('test@test.com');
    expect(mockUserDocRef.update).toHaveBeenCalled();
  });

  it('deve lançar ConflictException ao registrar e-mail duplicado', async () => {
    mockUsersQuery.where.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ email: 'ja@existe.com' }) }],
      }),
    });

    const dto: RegisterDto = {
      name: 'Teste',
      email: 'ja@existe.com',
      password: 'senha123',
    };
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });

  it('não deve retornar a senha no resultado do register', async () => {
    mockUsersQuery.where.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
    });
    mockUsersQuery.doc.mockReturnValueOnce(mockUserDocRef);

    const dto: RegisterDto = {
      name: 'João',
      email: 'joao@test.com',
      password: 'senha123',
    };
    const result = await service.register(dto);

    expect(result).not.toHaveProperty('password');
    expect(result).toHaveProperty('email', 'joao@test.com');
  });
});
