import { SetMetadata } from '@nestjs/common';

export enum AccessLevel {
  PUBLIC = 'public',      // 完全公开
  OPTIONAL_AUTH = 'optional_auth', // 可选认证
  REQUIRED_AUTH = 'required_auth'  // 必须认证
}

export const ACCESS_LEVEL_KEY = 'access_level';
export const AccessControl = (level: AccessLevel) => SetMetadata(ACCESS_LEVEL_KEY, level);
