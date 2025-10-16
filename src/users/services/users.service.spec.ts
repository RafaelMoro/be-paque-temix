/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { UsersService } from './users.service';
import { User, UserDoc } from '../entities/users.entity';
import { MailService } from '@/mail/services/mail.service';
import config from '@/config';
import {
  CreateUserProps,
  CreateUserResponse,
  DeleteUserResponse,
  ForgotResetPasswordResponse,
  ResetPasswordResponse,
  PayloadTokenForgotPwd,
  Role,
} from '../users.interface';
import {
  ADMIN_USER_CREATED_MESSAGE,
  FORGOT_PASSWORD_MESSAGE,
  JWT_EXPIRED_ERROR,
  JWT_MALFORMED_ERROR,
  JWT_NOT_FOUND,
  RESET_PASSWORD_MESSAGE,
  USER_CREATED_MESSAGE,
  USER_DELETED_MESSAGE,
  USER_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
  WRONG_JWT_ERROR,
} from '../users.constant';
import { ForgotPasswordBodyDto } from '../dtos/users-responses.dto';
import { UpdateUserPasswordDto } from '../dtos/users.dto';

// Mock bcrypt module
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

// Mock users utils to avoid import issues
jest.mock('../users.utils', () => ({
  generateJWT: jest.fn(),
}));

// Mock mail service to avoid email dependencies
jest.mock('@/mail/services/mail.service', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendUserForgotPasswordEmail: jest.fn(),
  })),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userModel: jest.Mocked<Model<User>>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;
  let configService: any;

  const mockUser = {
    _id: 'mockUserId123',
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    role: ['user'] as Role[],
    password: 'hashedPassword123',
    phone: '1234567890',
    secondPhone: '',
    postalCode: '12345',
    companyName: 'Test Company',
    address: 'Test Address',
    oneTimeToken: 'mockToken123',
    numberOfEmployes: 1,
    businessType: 'retail',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
    toJSON: jest.fn(),
    id: 'mockUserId123',
  } as unknown as UserDoc;

  const mockCreateUserData = {
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    password: 'plainPassword123',
    phone: '1234567890',
    secondPhone: '',
    postalCode: '12345',
    companyName: 'Test Company',
    address: 'Test Address',
    numberOfEmployes: 1,
    businessType: 'retail',
  };

  const mockConfig = {
    version: '1.0.0',
    frontend: {
      uri: 'http://localhost',
      port: '3000',
    },
    environment: 'development',
    mail: {
      resendApiKey: 'test-api-key',
      mailerMail: 'test@mailer.com',
    },
  };

  beforeEach(async () => {
    const mockUserModel = {
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      updateOne: jest.fn(),
    };

    // Mock the constructor function for creating new user instances
    const mockUserConstructor = jest.fn().mockImplementation((data: any) => {
      const mockInstance = {
        ...data,
        save: jest.fn().mockResolvedValue({
          ...mockUser,
          ...data,
          toJSON: jest.fn().mockReturnValue({ ...mockUser, ...data }),
        }),
      };
      return mockInstance;
    });
    Object.assign(mockUserConstructor, mockUserModel);

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockMailService = {
      sendUserForgotPasswordEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserConstructor,
        },
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get(getModelToken(User.name));
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
    configService = module.get(config.KEY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should find user by email successfully', async () => {
      const email = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmail(email);

      expect(userModel.findOne).toHaveBeenCalledWith({ email });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const email = 'notfound@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findByEmail(email);

      expect(userModel.findOne).toHaveBeenCalledWith({ email });
      expect(result).toBeNull();
    });

    it('should throw Error on database error (exec rejection)', async () => {
      const email = 'test@example.com';
      const error = new Error('Database error');
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(error),
      } as any);

      // The database error is not caught by try-catch since it's a promise rejection
      await expect(service.findByEmail(email)).rejects.toThrow(
        'Database error',
      );
    });

    it('should throw Error with unknown error on exec rejection', async () => {
      const email = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue('Unknown error'),
      } as any);

      // Promise rejections are not caught by try-catch in this implementation
      await expect(service.findByEmail(email)).rejects.toThrow();
    });
  });

  describe('createUser', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    });

    it('should create a regular user successfully', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const savedUserData = {
        email: mockCreateUserData.email,
        name: mockCreateUserData.name,
        lastName: mockCreateUserData.lastName,
        role: ['user'],
      };

      const mockUserInstance = {
        ...mockCreateUserData,
        role: ['user'],
        password: 'plainPassword123', // This should be the original password before hashing
        save: jest.fn().mockResolvedValue({
          toJSON: jest.fn().mockReturnValue(savedUserData),
        }),
      };

      // Mock the userModel constructor to return our mock instance
      (userModel as any).mockImplementation(() => mockUserInstance);

      const createUserProps: CreateUserProps = {
        data: mockCreateUserData as any,
        isAdmin: false,
      };

      const result = await service.createUser(createUserProps);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: mockCreateUserData.email,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword123', 10);
      expect(mockUserInstance.save).toHaveBeenCalled();

      const expectedResponse: CreateUserResponse = {
        version: '1.0.0',
        message: USER_CREATED_MESSAGE,
        error: null,
        data: {
          user: {
            email: mockCreateUserData.email,
            name: mockCreateUserData.name,
            lastName: mockCreateUserData.lastName,
            role: ['user'],
          },
        },
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should create an admin user successfully', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const savedUserData = {
        email: mockCreateUserData.email,
        name: mockCreateUserData.name,
        lastName: mockCreateUserData.lastName,
        role: ['admin', 'user'],
      };

      const mockUserInstance = {
        ...mockCreateUserData,
        role: ['admin', 'user'],
        password: 'plainPassword123', // This should be the original password before hashing
        save: jest.fn().mockResolvedValue({
          toJSON: jest.fn().mockReturnValue(savedUserData),
        }),
      };

      (userModel as any).mockImplementation(() => mockUserInstance);

      const createUserProps: CreateUserProps = {
        data: mockCreateUserData as any,
        isAdmin: true,
      };

      const result = await service.createUser(createUserProps);

      expect(result.message).toBe(ADMIN_USER_CREATED_MESSAGE);
      expect(result.data.user.role).toEqual(['admin', 'user']);
    });

    it('should throw BadRequestException if user already exists', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const createUserProps: CreateUserProps = {
        data: mockCreateUserData as any,
        isAdmin: false,
      };

      await expect(service.createUser(createUserProps)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createUser(createUserProps)).rejects.toThrow(
        USER_EXISTS_ERROR,
      );
    });

    it('should handle bcrypt errors', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      const createUserProps: CreateUserProps = {
        data: mockCreateUserData as any,
        isAdmin: false,
      };

      await expect(service.createUser(createUserProps)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createUser(createUserProps)).rejects.toThrow(
        'Bcrypt error',
      );
    });
  });

  describe('forgotPassword', () => {
    const mockGenerateJWT = require('../users.utils').generateJWT as jest.Mock;

    beforeEach(() => {
      mockGenerateJWT.mockReturnValue('mockOneTimeToken123');
    });

    it('should send forgot password email successfully', async () => {
      const email = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.updateOne.mockResolvedValue({} as any);
      mailService.sendUserForgotPasswordEmail.mockResolvedValue(undefined);

      const payload: ForgotPasswordBodyDto = { email };
      const result = await service.forgotPassword(payload);

      expect(userModel.findOne).toHaveBeenCalledWith({ email });
      expect(mockGenerateJWT).toHaveBeenCalledWith(mockUser, jwtService);
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser.id },
        { oneTimeToken: 'mockOneTimeToken123' },
        { multi: true },
      );
      expect(mailService.sendUserForgotPasswordEmail).toHaveBeenCalledWith({
        email,
        name: mockUser.name,
        hostname: 'http://localhost:3000',
        lastName: mockUser.lastName,
        oneTimeToken: 'mockOneTimeToken123',
      });

      const expectedResponse: ForgotResetPasswordResponse = {
        version: '1.0.0',
        message: FORGOT_PASSWORD_MESSAGE,
        data: null,
        error: null,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should use production hostname in production environment', async () => {
      configService.environment = 'production';
      const email = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.updateOne.mockResolvedValue({} as any);
      mailService.sendUserForgotPasswordEmail.mockResolvedValue(undefined);

      const payload: ForgotPasswordBodyDto = { email };
      await service.forgotPassword(payload);

      expect(mailService.sendUserForgotPasswordEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'http://localhost',
        }),
      );

      // Reset environment
      configService.environment = 'development';
    });

    it('should throw NotFoundException if user not found', async () => {
      const email = 'notfound@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const payload: ForgotPasswordBodyDto = { email };

      await expect(service.forgotPassword(payload)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.forgotPassword(payload)).rejects.toThrow(
        USER_NOT_FOUND_ERROR,
      );
    });

    it('should handle mail service errors', async () => {
      const email = 'test@example.com';
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);
      userModel.updateOne.mockResolvedValue({} as any);
      mailService.sendUserForgotPasswordEmail.mockRejectedValue(
        new Error('Mail service error'),
      );

      const payload: ForgotPasswordBodyDto = { email };

      await expect(service.forgotPassword(payload)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.forgotPassword(payload)).rejects.toThrow(
        'Mail service error',
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', () => {
      const token = 'validToken123';
      const mockPayload: PayloadTokenForgotPwd = { sub: 'userId123' };
      jwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyToken(token);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(result).toEqual(mockPayload);
    });

    it('should throw BadRequestException for expired token', () => {
      const token = 'expiredToken';
      const error = new Error(JWT_EXPIRED_ERROR);
      jwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken(token)).toThrow(BadRequestException);
      expect(() => service.verifyToken(token)).toThrow(JWT_EXPIRED_ERROR);
    });

    it('should throw BadRequestException for malformed token', () => {
      const token = 'malformedToken';
      const error = new Error(JWT_MALFORMED_ERROR);
      jwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken(token)).toThrow(BadRequestException);
      expect(() => service.verifyToken(token)).toThrow(JWT_MALFORMED_ERROR);
    });

    it('should throw BadRequestException for general JWT errors', () => {
      const token = 'invalidToken';
      const error = new Error('General JWT error');
      jwtService.verify.mockImplementation(() => {
        throw error;
      });

      expect(() => service.verifyToken(token)).toThrow(BadRequestException);
      expect(() => service.verifyToken(token)).toThrow('General JWT error');
    });

    it('should handle unknown errors', () => {
      const token = 'invalidToken';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Unknown error');
      });

      expect(() => service.verifyToken(token)).toThrow(BadRequestException);
      expect(() => service.verifyToken(token)).toThrow(
        'An unknown error occurred',
      );
    });
  });

  describe('updatePassword', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
    });

    it('should update password successfully', async () => {
      const changes: UpdateUserPasswordDto = {
        uid: 'userId123',
        password: 'newPassword123',
      };

      const updatedUser = { ...mockUser };
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedUser),
      } as any);

      const result = await service.updatePassword(changes);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'userId123',
        { $set: { password: 'newHashedPassword' } },
        { new: true },
      );

      expect(result).toEqual({
        message: 'password updated',
        data: null,
        error: null,
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      const changes: UpdateUserPasswordDto = {
        uid: 'nonexistentUserId',
        password: 'newPassword123',
      };

      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.updatePassword(changes)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updatePassword(changes)).rejects.toThrow(
        USER_NOT_FOUND_ERROR,
      );
    });

    it('should handle bcrypt errors', async () => {
      const changes: UpdateUserPasswordDto = {
        uid: 'userId123',
        password: 'newPassword123',
      };

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.updatePassword(changes)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updatePassword(changes)).rejects.toThrow(
        'Bcrypt error',
      );
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
    });

    it('should reset password successfully', async () => {
      const oneTimeToken = 'validToken123';
      const newPassword = 'newPassword123';
      const mockPayload: PayloadTokenForgotPwd = { sub: 'userId123' };

      jwtService.verify.mockReturnValue(mockPayload);
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          oneTimeToken: 'validToken123',
        }),
      } as any);
      userModel.updateOne.mockResolvedValue({} as any);
      userModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.resetPassword(oneTimeToken, newPassword);

      expect(jwtService.verify).toHaveBeenCalledWith(oneTimeToken);
      expect(userModel.findOne).toHaveBeenCalledWith({ _id: 'userId123' });
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: mockUser.id },
        { $unset: { oneTimeToken: '' } },
      );

      const expectedResponse: ResetPasswordResponse = {
        version: '1.0.0',
        message: RESET_PASSWORD_MESSAGE,
        data: null,
        error: null,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException for invalid token verification', async () => {
      const oneTimeToken = 'invalidToken';
      const newPassword = 'newPassword123';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      const oneTimeToken = 'validToken123';
      const newPassword = 'newPassword123';
      const mockPayload: PayloadTokenForgotPwd = { sub: 'userId123' };

      jwtService.verify.mockReturnValue(mockPayload);
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(USER_NOT_FOUND_ERROR);
    });

    it('should throw BadRequestException if one time token not found in user', async () => {
      const oneTimeToken = 'validToken123';
      const newPassword = 'newPassword123';
      const mockPayload: PayloadTokenForgotPwd = { sub: 'userId123' };

      jwtService.verify.mockReturnValue(mockPayload);
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          oneTimeToken: '',
        }),
      } as any);

      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(JWT_NOT_FOUND);
    });

    it('should throw BadRequestException if tokens do not match', async () => {
      const oneTimeToken = 'token123';
      const newPassword = 'newPassword123';
      const mockPayload: PayloadTokenForgotPwd = { sub: 'userId123' };

      jwtService.verify.mockReturnValue(mockPayload);
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockUser,
          oneTimeToken: 'differentToken456',
        }),
      } as any);

      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword(oneTimeToken, newPassword),
      ).rejects.toThrow(WRONG_JWT_ERROR);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const email = 'test@example.com';
      const deletedUser = {
        ...mockUser,
        email,
      };

      userModel.findOneAndDelete.mockResolvedValue(deletedUser as any);

      const result = await service.deleteUser(email);

      expect(userModel.findOneAndDelete).toHaveBeenCalledWith({ email });

      const expectedResponse: DeleteUserResponse = {
        version: '1.0.0',
        error: null,
        message: USER_DELETED_MESSAGE,
        data: {
          user: {
            email,
            name: mockUser.name,
            lastName: mockUser.lastName,
          },
        },
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException if email is missing', async () => {
      await expect(service.deleteUser(undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(undefined)).rejects.toThrow(
        'Email is missing',
      );
    });

    it('should throw BadRequestException if user not found', async () => {
      const email = 'notfound@example.com';
      userModel.findOneAndDelete.mockResolvedValue(null);

      await expect(service.deleteUser(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(email)).rejects.toThrow(
        USER_NOT_FOUND_ERROR,
      );
    });

    it('should handle database errors', async () => {
      const email = 'test@example.com';
      userModel.findOneAndDelete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteUser(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(email)).rejects.toThrow('Database error');
    });

    it('should handle unknown errors', async () => {
      const email = 'test@example.com';
      userModel.findOneAndDelete.mockRejectedValue('Unknown error');

      await expect(service.deleteUser(email)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteUser(email)).rejects.toThrow(
        'An unknown error occurred',
      );
    });
  });
});
