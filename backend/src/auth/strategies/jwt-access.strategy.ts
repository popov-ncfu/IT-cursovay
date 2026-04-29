import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthUser, JwtAccessPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? 'change_me',
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthUser> {
    // Enforce token type to prevent accidental usage of refresh tokens.
    if (payload.type !== 'access') throw new UnauthorizedException('Invalid token type.');

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

