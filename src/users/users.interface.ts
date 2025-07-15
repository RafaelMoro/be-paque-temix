import { GeneralResponse } from '@/global.interface';
import { CreateUserDto } from './dtos/users.dto';

export type Role = 'admin' | 'user';

export enum RoleEnum {
  admin = 'admin',
  user = 'user',
}

export interface CreateUserProps {
  data: CreateUserDto;
  isAdmin?: boolean;
}

export interface CreateUserData {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
}

export interface CreateUserResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    user: CreateUserData;
  };
}

export interface DeleteUserResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    user: {
      name: string;
      lastName: string;
      email: string;
    };
  };
}

export interface ForgotResetPasswordResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: null;
}

export interface LoginDataUser {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
}

export interface LoginData {
  accessToken: string;
  user: LoginDataUser;
}
