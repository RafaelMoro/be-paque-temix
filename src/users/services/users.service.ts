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
  ResetPasswordResponse,
  PayloadTokenForgotPwd,
} from '../users.interface';
import {
  ADMIN_USER_CREATED_MESSAGE,
  FORGOT_PASSWORD_MESSAGE,
  JWT_EXPIRED_ERROR,
  JWT_INVALID_ERROR,
  JWT_MALFORMED_ERROR,
  JWT_NOT_FOUND,
  RESET_PASSWORD_MESSAGE,
  USER_CREATED_MESSAGE,
  USER_DELETED_MESSAGE,
  USER_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
  WRONG_JWT_ERROR,
} from '../users.constant';
import config from '@/config';
import { ConfigType } from '@nestjs/config';
import { MailForgotPasswordDto } from '@/mail/dtos/mail.dto';
import { PROD_ENV } from '@/app.constant';
import { generateJWT } from '../users.utils';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@/mail/services/mail.service';
import { ForgotPasswordBodyDto } from '../dtos/users-responses.dto';
import { UpdateUserPasswordDto } from '../dtos/users.dto';

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

  verifyToken(token: string): PayloadTokenForgotPwd {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error?.message === JWT_EXPIRED_ERROR) {
          throw new BadRequestException(JWT_EXPIRED_ERROR);
        }
        if (error?.message === JWT_MALFORMED_ERROR) {
          throw new BadRequestException(JWT_MALFORMED_ERROR);
        }
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updatePassword(changes: UpdateUserPasswordDto) {
    try {
      const { uid, password } = changes;
      const passwordHashed = await bcrypt.hash(password, 10);

      const model: UserDoc | null = await this.userModel
        .findByIdAndUpdate(
          uid,
          { $set: { password: passwordHashed } },
          { new: true },
        )
        .exec();
      if (!model) throw new BadRequestException(USER_NOT_FOUND_ERROR);
      const response = {
        message: 'password updated',
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

  async resetPassword(oneTimeToken: string, password: string) {
    try {
      const tokenVerified: PayloadTokenForgotPwd =
        this.verifyToken(oneTimeToken);
      if (!tokenVerified) throw new BadRequestException(JWT_INVALID_ERROR);

      const userId: string = tokenVerified.sub;
      const user: UserDoc | null = await this.userModel
        .findOne({ _id: userId })
        .exec();
      if (!user) throw new BadRequestException(USER_NOT_FOUND_ERROR);
      const { _id } = user;
      const userIdGotten = _id as string;

      const userOneTimeToken = user.oneTimeToken;
      if (!userOneTimeToken) throw new BadRequestException(JWT_NOT_FOUND);

      if (oneTimeToken !== userOneTimeToken)
        throw new BadRequestException(WRONG_JWT_ERROR);

      await this.userModel.updateOne(
        { _id: user.id },
        { $unset: { oneTimeToken: '' } },
      );
      await this.updatePassword({ uid: userIdGotten, password });
      const npmVersion: string = this.configService.version!;
      const response: ResetPasswordResponse = {
        version: npmVersion,
        message: RESET_PASSWORD_MESSAGE,
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
