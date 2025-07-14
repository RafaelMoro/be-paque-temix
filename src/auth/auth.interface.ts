import { Role } from '@/users/users.interface';

export interface PayloadToken {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
}

export interface GenerateJWTUser {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
}
