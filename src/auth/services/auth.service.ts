import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { FlattenMaps } from 'mongoose';

import { UserDoc } from '@/users/entities/users.entity';
import { UsersService } from '@/users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    // private jwtService: JwtService,
  ) {}

  async validatePasswordOfUser(email: string, password: string) {
    const user: UserDoc | null = await this.usersService.findByEmail(email);
    // If the user has been deleted, return null where the strategy will throw the exception
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const userResponse: FlattenMaps<UserDoc> = user.toJSON();
      const { name, lastName, email } = userResponse;
      return {
        name,
        lastName,
        email,
      };
    }
    return null;
  }

  // generateJWTAuth(user: User): LoginData {
  //   const { email, firstName, lastName, role } = user;
  //   const formattedUser: LoginDataUser = {
  //     email,
  //     firstName,
  //     lastName,
  //     role,
  //   };
  //   const accessToken = generateJWT(user, this.jwtService);
  //   const loginData: LoginData = {
  //     accessToken,
  //     user: formattedUser,
  //   };
  //   return loginData;
  // }
}
