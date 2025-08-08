import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { FlattenMaps } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

import { User, UserDoc } from '@/users/entities/users.entity';
import { UsersService } from '@/users/services/users.service';
import { LoginData, LoginDataUser } from '@/users/users.interface';
import { generateJWT } from '../auth.utils';
import config from '@/config';
import { ConfigType } from '@nestjs/config';
import { LoginResponse } from '../auth.interface';

@Injectable()
export class AuthService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validatePasswordOfUser(email: string, password: string) {
    const user: UserDoc | null = await this.usersService.findByEmail(email);
    // If the user has been deleted, return null where the strategy will throw the exception
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const userResponse: FlattenMaps<UserDoc> = user.toJSON();
      const { name, lastName, email, role } = userResponse;
      return {
        name,
        lastName,
        email,
        role,
      };
    }
    return null;
  }

  generateJWTAuth(user: User): LoginData {
    const { email, name, lastName, role } = user;
    const formattedUser: LoginDataUser = {
      email,
      name,
      lastName,
      role,
    };
    const accessToken = generateJWT(user, this.jwtService);
    const loginData: LoginData = {
      accessToken,
      user: formattedUser,
    };
    return loginData;
  }

  formatLoginResponse(user: LoginDataUser) {
    const npmVersion: string = this.configService.version!;
    const response: LoginResponse = {
      version: npmVersion,
      message: null,
      data: {
        user,
      },
      error: null,
    };
    return response;
  }
}
