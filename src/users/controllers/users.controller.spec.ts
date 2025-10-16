import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../entities/users.entity';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '@/mail/services/mail.service';
import { Reflector } from '@nestjs/core';
import config from '@/config';

// Mock the mail service module to avoid React import issues
jest.mock('@/mail/services/mail.service', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendUserForgotPasswordEmail: jest.fn(),
  })),
}));

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockMailService = {
    sendUserForgotPasswordEmail: jest.fn(),
  };

  const mockConfigService = {
    version: '1.0.0',
    database: {
      cluster: 'test-cluster',
      mongoDbName: 'test-db',
      user: 'test-user',
      password: 'test-password',
      connection: 'test-connection',
    },
    auth: {
      jwtKey: 'test-jwt-key',
      publicKey: 'test-public-key',
      roleKey: 'test-role-key',
      oneTimeJwtKey: 'test-one-time-jwt-key',
    },
    frontend: {
      port: '3000',
      uri: 'http://localhost',
    },
    mail: {
      resendApiKey: 'test-api-key',
      mailerMail: 'test@mailer.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(false),
          },
        },
        {
          provide: config.KEY,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUser', () => {
    it('should call usersService.findByEmail with correct email', async () => {
      const email = 'john.doe@mail.com';
      const mockUser = {
        _id: '68351afb0e685e9fe702e63b',
        name: 'John',
        lastName: 'Doe',
        email: 'john.doe@mail.com',
        role: ['user'],
        phone: 123456789,
        postalCode: 785,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser as any);

      const result = await controller.getUser(email);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUsersService.findByEmail).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUser);
    });

    it('should handle service errors', async () => {
      const email = 'nonexistent@mail.com';
      const error = new Error('User not found');

      mockUsersService.findByEmail.mockRejectedValue(error);

      await expect(controller.getUser(email)).rejects.toThrow('User not found');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
    });
  });

  describe('createUser', () => {
    it('should call usersService.createUser with correct payload', async () => {
      const createUserDto = {
        email: 'new@example.com',
        name: 'Jane',
        lastName: 'Smith',
        password: 'password123',
        phone: '987654321',
        postalCode: '54321',
        companyName: 'Test Corp',
        address: 'Test Address',
        numberOfEmployes: 10,
        businessType: 'technology',
      };

      const mockResponse = {
        version: '1.0.0',
        message: 'User created successfully.',
        error: null,
      };

      mockUsersService.createUser.mockResolvedValue(mockResponse as any);

      const result = await controller.createUser(createUserDto as any);

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        data: createUserDto,
      });
      expect(mockUsersService.createUser).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors for duplicate email', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        name: 'Jane',
        lastName: 'Smith',
        password: 'password123',
        phone: '987654321',
        postalCode: '54321',
        companyName: 'Test Corp',
        address: 'Test Address',
        numberOfEmployes: 10,
        businessType: 'technology',
      };

      const error = new Error('Email already exists');
      mockUsersService.createUser.mockRejectedValue(error);

      await expect(controller.createUser(createUserDto as any)).rejects.toThrow(
        'Email already exists',
      );
      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        data: createUserDto,
      });
    });
  });

  describe('createAdminUser', () => {
    it('should call usersService.createUser with isAdmin flag', async () => {
      const createUserDto = {
        email: 'admin@example.com',
        name: 'Admin',
        lastName: 'User',
        password: 'adminpass123',
        phone: '111222333',
        postalCode: '99999',
        companyName: 'Admin Corp',
        address: 'Admin Address',
        numberOfEmployes: 1,
        businessType: 'administration',
      };

      const mockResponse = {
        version: '1.0.0',
        message: 'Admin user created successfully.',
        error: null,
      };

      mockUsersService.createUser.mockResolvedValue(mockResponse as any);

      const result = await controller.createAdminUser(createUserDto as any);

      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        data: createUserDto,
        isAdmin: true,
      });
      expect(mockUsersService.createUser).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });
  });

  describe('forgotPassword', () => {
    it('should call usersService.forgotPassword with correct payload', async () => {
      const forgotPasswordDto = {
        email: 'forgot@example.com',
      };

      const mockResponse = {
        version: '1.0.0',
        message: 'Password reset email sent.',
        error: null,
      };

      mockUsersService.forgotPassword.mockResolvedValue(mockResponse as any);

      const result = await controller.forgotPassword(forgotPasswordDto as any);

      expect(mockUsersService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto,
      );
      expect(mockUsersService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
      };

      const error = new Error('User not found');
      mockUsersService.forgotPassword.mockRejectedValue(error);

      await expect(
        controller.forgotPassword(forgotPasswordDto as any),
      ).rejects.toThrow('User not found');
      expect(mockUsersService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto,
      );
    });
  });

  describe('resetPassword', () => {
    it('should call usersService.resetPassword with correct parameters', async () => {
      const oneTimeToken = 'test-token-123';
      const resetPasswordDto = {
        password: 'newpassword123',
      };

      const mockResponse = {
        version: '1.0.0',
        message: 'Password reset successfully.',
        error: null,
      };

      mockUsersService.resetPassword.mockResolvedValue(mockResponse as any);

      const result = await controller.resetPassword(
        oneTimeToken,
        resetPasswordDto as any,
      );

      expect(mockUsersService.resetPassword).toHaveBeenCalledWith(
        oneTimeToken,
        'newpassword123',
      );
      expect(mockUsersService.resetPassword).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle invalid token errors', async () => {
      const oneTimeToken = 'invalid-token';
      const resetPasswordDto = {
        password: 'newpassword123',
      };

      const error = new Error('Invalid token');
      mockUsersService.resetPassword.mockRejectedValue(error);

      await expect(
        controller.resetPassword(oneTimeToken, resetPasswordDto as any),
      ).rejects.toThrow('Invalid token');
      expect(mockUsersService.resetPassword).toHaveBeenCalledWith(
        oneTimeToken,
        'newpassword123',
      );
    });
  });

  describe('deleteUser', () => {
    it('should call usersService.deleteUser with email from request', async () => {
      const mockRequest = {
        user: {
          email: 'delete@example.com',
        },
      } as any;

      const mockResponse = {
        version: '1.0.0',
        message: 'User deleted successfully.',
        error: null,
      };

      mockUsersService.deleteUser.mockResolvedValue(mockResponse as any);

      const result = await controller.deleteUser(mockRequest);

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(
        'delete@example.com',
      );
      expect(mockUsersService.deleteUser).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockResponse);
    });

    it('should handle missing user in request', async () => {
      const mockRequest = {
        user: undefined,
      } as any;

      const mockResponse = {
        version: '1.0.0',
        message: 'User deleted successfully.',
        error: null,
      };

      mockUsersService.deleteUser.mockResolvedValue(mockResponse as any);

      const result = await controller.deleteUser(mockRequest);

      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(undefined);
      expect(result).toBe(mockResponse);
    });

    it('should handle service errors', async () => {
      const mockRequest = {
        user: {
          email: 'nonexistent@example.com',
        },
      } as any;

      const error = new Error('User not found');
      mockUsersService.deleteUser.mockRejectedValue(error);

      await expect(controller.deleteUser(mockRequest)).rejects.toThrow(
        'User not found',
      );
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
    });
  });
});
