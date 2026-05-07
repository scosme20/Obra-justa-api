import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from '../config/firebase.config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const snapshot = await db
      .collection('users')
      .where('email', '==', email)
      .get();
    if (snapshot.empty)
      throw new UnauthorizedException('E-mail ou senha inválidos');

    const userData = snapshot.docs[0].data();
    const isValid = await bcrypt.compare(password, userData.password);
    if (!isValid) throw new UnauthorizedException('E-mail ou senha inválidos');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...result } = userData;
    return result;
  }

  private generateTokens(user: { id: string; email: string }) {
    const payload = { email: user.email, sub: user.id };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1d',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    return { access_token, refresh_token };
  }

  async login(user: any) {
    const tokens = this.generateTokens(user);

    // Persiste o refresh token no Firestore (hashed)
    const hashed = await bcrypt.hash(tokens.refresh_token, 8);
    await db.collection('users').doc(user.id).update({
      refreshToken: hashed,
      lastLoginAt: new Date().toISOString(),
    });

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const userDoc = await db.collection('users').doc(payload.sub).get();
    if (!userDoc.exists)
      throw new UnauthorizedException('Usuário não encontrado');

    const user = userDoc.data();
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken || '');
    if (!isValid) throw new UnauthorizedException('Refresh token inválido');

    const tokens = this.generateTokens({
      id: payload.sub,
      email: payload.email,
    });

    // Rotaciona o refresh token
    const hashed = await bcrypt.hash(tokens.refresh_token, 8);
    await db
      .collection('users')
      .doc(payload.sub)
      .update({ refreshToken: hashed });

    return tokens;
  }

  async logout(userId: string) {
    await db.collection('users').doc(userId).update({ refreshToken: null });
    return { success: true, message: 'Sessão encerrada.' };
  }

  async register(data: RegisterDto) {
    const existing = await db
      .collection('users')
      .where('email', '==', data.email)
      .get();
    if (!existing.empty) throw new ConflictException('E-mail já cadastrado');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userRef = db.collection('users').doc();
    const newUser = {
      id: userRef.id,
      name: data.name,
      email: data.email,
      role: data.role ?? 'owner',
      password: hashedPassword,
      refreshToken: null,
      createdAt: new Date().toISOString(),
    };
    await userRef.set(newUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, ...result } = newUser;
    return result;
  }
}
