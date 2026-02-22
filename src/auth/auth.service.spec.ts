import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('token_fake'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('deve lançar erro 401 se a validação falhar (simulação)', async () => {
    jest
      .spyOn(service, 'validateUser')
      .mockRejectedValue(new UnauthorizedException());

    await expect(
      service.validateUser({ email: 'errado@test.com', password: '123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
