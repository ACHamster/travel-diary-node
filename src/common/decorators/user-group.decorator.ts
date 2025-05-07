// src/common/decorators/user-groups.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const USERGROUPS_KEY = 'usergroups';
export const UserGroups = (...groups: string[]) => SetMetadata(USERGROUPS_KEY, groups);
