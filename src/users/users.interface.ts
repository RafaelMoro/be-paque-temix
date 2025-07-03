import { CreateUserDto } from './dtos/users.dto';

export type Role = 'admin' | 'user';

export interface CreateUserProps {
  data: CreateUserDto;
  isAdmin?: boolean;
}

export interface CreateUserResponse {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
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
