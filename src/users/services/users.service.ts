import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDoc } from '../entities/users.entity';
import {
  CreateUserProps,
  CreateUserData,
  CreateUserResponse,
  DeleteUserResponse,
} from '../users.interface';
import {
  ADMIN_USER_CREATED_MESSAGE,
  USER_CREATED_MESSAGE,
  USER_DELETED_MESSAGE,
  USER_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
} from '../users.constant';
import config from '@/config';
import { ConfigType } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

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
      const createUserData: CreateUserData = {
        email,
        name,
        lastName,
        role: roleResponse,
      };
      const npmVersion: string = this.configService.version;
      const response: CreateUserResponse = {
        version: npmVersion,
        message: isAdmin ? ADMIN_USER_CREATED_MESSAGE : USER_CREATED_MESSAGE,
        error: null,
        data: {
          user: createUserData,
        },
      };
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async deleteUser(userId: string) {
    try {
      const userDeletedModel: UserDoc | null =
        await this.userModel.findByIdAndDelete(userId);
      if (!userDeletedModel)
        throw new BadRequestException(USER_NOT_FOUND_ERROR);

      const { email, name, lastName } = userDeletedModel;
      const npmVersion: string = this.configService.version;
      const response: DeleteUserResponse = {
        version: npmVersion,
        error: null,
        message: USER_DELETED_MESSAGE,
        data: {
          user: {
            email,
            name,
            lastName,
          },
        },
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
