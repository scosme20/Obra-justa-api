import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db } from '../config/firebase.config';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const userSnapshot = await db
      .collection('users')
      .where('email', '==', email)
      .get();

    if (userSnapshot.empty) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const userData = userSnapshot.docs[0].data();

    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const { password: _pwd, ...result } = userData;
    void _pwd;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async register(data: RegisterDto) {
    const existing = await db
      .collection('users')
      .where('email', '==', data.email)
      .get();

    if (!existing.empty) {
      throw new UnauthorizedException('E-mail já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const userRef = db.collection('users').doc();
    const { password: _pwd, ...safeData } = {
      ...data,
      password: data.password,
    };
    void _pwd;
    const newUser = {
      id: userRef.id,
      ...safeData,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };
    await userRef.set(newUser);
    const { password: _p2, ...result } = newUser;
    void _p2;
    return result;
  }
}
