import { Role } from '@/users/users.interface';
import { SetMetadata } from '@nestjs/common';

const roleKey = process.env.ROLE_KEY;
// Typing the role as (...roles: Role[]) could accept an empty array
// Typing it this way it means that at least it should have one role
// Using the spread operator to pass the roles as an array
export const Roles = (...roles: [Role, ...Role[]]) =>
  SetMetadata(roleKey, roles);
