import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { User, UserDoc } from '../entities/users.entity';
import {
  CreateUserProps,
  CreateUserData,
  CreateUserResponse,
  DeleteUserResponse,
  ForgotResetPasswordResponse,
} from '../users.interface';
import {
  ADMIN_USER_CREATED_MESSAGE,
  FORGOT_PASSWORD_MESSAGE,
  USER_CREATED_MESSAGE,
  USER_DELETED_MESSAGE,
  USER_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
} from '../users.constant';
import config from '@/config';
import { ConfigType } from '@nestjs/config';
import { MailForgotPasswordDto } from '@/mail/dtos/mail.dto';
import { PROD_ENV } from '@/app.constant';
import { generateJWT } from '../users.utils';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@/mail/services/mail.service';
import { ForgotPasswordBodyDto } from '../dtos/users-responses.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private jwtService: JwtService,
    private mailService: MailService,
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
      const npmVersion: string = this.configService.version!;
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

  async forgotPassword(payload: ForgotPasswordBodyDto) {
    try {
      const { email } = payload;
      const { frontend, environment } = this.configService;
      const { uri = 'http://localhost', port = '3000' } = frontend;
      const completeHostname =
        environment === PROD_ENV ? uri : `${uri}:${port}`;

      const user: UserDoc | null = await this.findByEmail(email);
      if (!user) throw new NotFoundException(USER_NOT_FOUND_ERROR);

      const { name, lastName } = user;
      const oneTimeToken = generateJWT(user, this.jwtService);
      await this.userModel.updateOne(
        { _id: user.id },
        { oneTimeToken },
        { multi: true },
      );

      const emailPayload: MailForgotPasswordDto = {
        email,
        name,
        hostname: completeHostname,
        lastName,
        oneTimeToken,
      };
      await this.mailService.sendUserForgotPasswordEmail(emailPayload);

      const npmVersion: string = this.configService.version!;
      const response: ForgotResetPasswordResponse = {
        version: npmVersion,
        message: FORGOT_PASSWORD_MESSAGE,
        data: null,
        error: null,
      };
      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async deleteUser(email: string | undefined) {
    try {
      if (!email) {
        throw new BadRequestException('Email is missing');
      }
      const userDeletedModel: UserDoc | null =
        await this.userModel.findOneAndDelete({ email });
      if (!userDeletedModel)
        throw new BadRequestException(USER_NOT_FOUND_ERROR);

      const { name, lastName } = userDeletedModel;
      const npmVersion: string = this.configService.version!;
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
