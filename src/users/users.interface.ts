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
