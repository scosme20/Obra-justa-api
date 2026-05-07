import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refresh_token: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Criar nova conta' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Autenticar e receber access_token + refresh_token',
  })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body);
    return this.authService.login(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access_token usando refresh_token' })
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  @ApiOperation({ summary: 'Encerrar sessão e invalidar refresh_token' })
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }
}
