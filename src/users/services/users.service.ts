import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDoc } from '../entities/users.entity';
import { CreateUserProps, CreateUserResponse } from '../users.interface';
import { USER_EXISTS_ERROR } from '../users.constant';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByEmail(email: string): Promise<UserDoc | null> {
    try {
      return this.userModel.findOne({ email }).exec();
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createUser({
    data,
    isAdmin,
  }: CreateUserProps): Promise<CreateUserResponse> {
    try {
      //Verify if the user exists with the same email.
      const { email: emailData } = data;

      const user: UserDoc | null = await this.findByEmail(emailData);
      if (user) throw new BadRequestException(USER_EXISTS_ERROR);

      let newData = { ...data, role: ['user'] };
      if (isAdmin) {
        newData = { ...data, role: ['admin', 'user'] };
      }
      const userModel = new this.userModel(newData);
      const passwordHashed = await bcrypt.hash(userModel.password, 10);
      userModel.password = passwordHashed;
      const modelSaved: UserDoc = await userModel.save();
      const responseCreateUser: FlattenMaps<UserDoc> = modelSaved.toJSON();
      const { email, name, lastName, role: roleResponse } = responseCreateUser;
      const response: CreateUserResponse = {
        email,
        name,
        lastName,
        role: roleResponse,
      };
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
