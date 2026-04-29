import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
  AuthUser,
} from './types/jwt-payload.type';
import { User } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';

type RefreshTokenRecord = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenHash: string | null;
};

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret)
      throw new Error('JWT_ACCESS_SECRET env var is required.');
    if (!refreshSecret)
      throw new Error('JWT_REFRESH_SECRET env var is required.');

    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;

    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '30d',
    );
  }

  private toJwtExpiresIn(raw: string): number | StringValue {
    return /^\d+$/.test(raw) ? Number(raw) : (raw as StringValue);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email is already registered.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
      },
    });

    return this.sanitizeUser(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials.');

    return this.issueTokensForUser(user);
  }

  async refresh(dto: RefreshDto) {
    this.verifyRefreshToken(dto.refreshToken);

    // Refresh token rotation (server-side revocation).
    const tokenHash = this.sha256(dto.refreshToken);

    const record = (await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    })) as RefreshTokenRecord | null;

    if (!record) throw new UnauthorizedException('Invalid refresh token.');
    if (record.revokedAt)
      throw new UnauthorizedException('Refresh token is revoked.');
    if (record.expiresAt.getTime() <= Date.now())
      throw new UnauthorizedException('Refresh token expired.');

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
    });
    if (!user) throw new UnauthorizedException('User no longer exists.');

    // Issue new refresh token first, then revoke the old one to support atomic rotation intent.
    const {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenHash: newTokenHash,
    } = await this.issueTokensForUserWithRefreshRotation(user);

    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        replacedByTokenHash: newTokenHash,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(dto: LogoutDto) {
    if (!dto.refreshToken) {
      // Keeping it simple: logout is based on refresh token revocation.
      throw new UnauthorizedException('refreshToken is required.');
    }

    // If token is invalid or expired, still return success for idempotency.
    try {
      this.verifyRefreshToken(dto.refreshToken);
    } catch {
      return { success: true };
    }

    const tokenHash = this.sha256(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  me(user: AuthUser) {
    return user;
  }

  private sanitizeUser(user: User): AuthUser {
    return { userId: user.id, email: user.email, role: user.role };
  }

  private issueAccessToken(user: User, jti: string): string {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti,
    };

    // JwtModule is configured for access tokens; jti stays in payload for auditing.
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.toJwtExpiresIn(this.accessExpiresIn),
    });
  }

  private createRefreshToken(user: User): Promise<{
    refreshToken: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }> {
    const jti = randomUUID();
    const payload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.toJwtExpiresIn(this.refreshExpiresIn),
    });

    const refreshTokenHash = this.sha256(refreshToken);
    const expiresAt = new Date(
      Date.now() + this.parseExpiresInMs(this.refreshExpiresIn),
    );

    return this.prisma.refreshToken
      .create({
        data: {
          tokenHash: refreshTokenHash,
          userId: user.id,
          expiresAt,
        },
      })
      .then(() => ({
        refreshToken,
        refreshTokenHash,
        expiresAt,
      }));
  }

  private async issueTokensForUser(user: User) {
    const accessJti = randomUUID();
    const accessToken = this.issueAccessToken(user, accessJti);
    const { refreshToken } = await this.createRefreshToken(user);
    return { accessToken, refreshToken };
  }

  private async issueTokensForUserWithRefreshRotation(user: User) {
    const accessJti = randomUUID();
    const accessToken = this.issueAccessToken(user, accessJti);

    const { refreshToken, refreshTokenHash } =
      await this.createRefreshToken(user);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  private verifyRefreshToken(refreshToken: string): JwtRefreshPayload {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (!payload || payload.type !== 'refresh')
      throw new UnauthorizedException('Invalid refresh token type.');

    return payload;
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private parseExpiresInMs(expiresIn: string): number {
    // Supports values like "15m", "30d". If config is something else, fall back to 30 days.
    const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
    if (!match) return 30 * 24 * 60 * 60 * 1000;

    const amount = Number(match[1]);
    const unit = match[2];

    const msPerUnit: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (msPerUnit[unit] ?? 30 * 24 * 60 * 60 * 1000);
  }
}
