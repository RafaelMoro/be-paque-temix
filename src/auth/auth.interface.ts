import { GeneralResponse } from '@/global.interface';
import { LoginDataUser, Role } from '@/users/users.interface';

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

export interface LoginResponse extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    user: LoginDataUser;
  };
}
