import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Criar uma nova conta de usuário' })
  @ApiBody({
    schema: {
      example: {
        name: 'Seu Nome',
        email: 'usuario@email.com',
        password: 'senha123',
        role: 'owner',
      },
    },
  })
  async register(@Body() body: any) {
    return await this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e receber Token JWT' })
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto);

    return this.authService.login(user);
  }
}
