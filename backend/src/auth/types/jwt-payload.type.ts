import { Role } from '@prisma/client';

export type JwtAccessPayload = {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
  jti: string;
};

export type JwtRefreshPayload = {
  sub: string;
  email: string;
  role: Role;
  type: 'refresh';
  jti: string;
};

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};

