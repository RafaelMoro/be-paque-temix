/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { User } from '@/users/entities/users.entity';
import { LoginDataUser, Role, LoginData } from '@/users/users.interface';
import { LoginResponse } from '../auth.interface';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/app.constant';

// Mock the AuthService module to avoid email dependencies
jest.mock('../services/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    generateJWTAuth: jest.fn(),
    formatLoginResponse: jest.fn(),
  })),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockUser = {
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
    oneTimeToken: '',
    numberOfEmployes: 1,
    businessType: 'retail',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as User;

  const mockLoginDataUser: LoginDataUser = {
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    role: ['user'] as Role[],
  };

  const mockLoginData: LoginData = {
    accessToken: 'mock-jwt-token-123',
    user: mockLoginDataUser,
  };

  const mockLoginResponse: LoginResponse = {
    version: '1.0.0',
    message: null,
    data: {
      user: mockLoginDataUser,
    },
    error: null,
  };

  beforeEach(async () => {
    const mockAuthService = {
      generateJWTAuth: jest.fn(),
      formatLoginResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    // Mock Express Request and Response objects
    mockRequest = {
      user: mockUser,
    };

    mockResponse = {
      cookie: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('loginLocal', () => {
    it('should successfully log in user and set cookie', () => {
      // Mock service methods
      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      const result = controller.loginLocal(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify AuthService.generateJWTAuth was called with user
      expect(authService.generateJWTAuth).toHaveBeenCalledWith(mockUser);

      // Verify cookie was set with correct parameters
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'mock-jwt-token-123',
        {
          httpOnly: true,
          secure: false, // NODE_ENV is not PROD in test
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 5, // 5 days
        },
      );

      // Verify AuthService.formatLoginResponse was called with user data
      expect(authService.formatLoginResponse).toHaveBeenCalledWith(
        mockLoginDataUser,
      );

      // Verify return value
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle admin user login', () => {
      const adminUser = {
        ...mockUser,
        role: ['admin'] as Role[],
      } as unknown as User;

      const adminLoginDataUser: LoginDataUser = {
        ...mockLoginDataUser,
        role: ['admin'] as Role[],
      };

      const adminLoginData: LoginData = {
        accessToken: 'admin-jwt-token-123',
        user: adminLoginDataUser,
      };

      const adminLoginResponse: LoginResponse = {
        ...mockLoginResponse,
        data: {
          user: adminLoginDataUser,
        },
      };

      mockRequest.user = adminUser;

      // Mock service methods for admin user
      authService.generateJWTAuth.mockReturnValue(adminLoginData);
      authService.formatLoginResponse.mockReturnValue(adminLoginResponse);

      const result = controller.loginLocal(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(authService.generateJWTAuth).toHaveBeenCalledWith(adminUser);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'admin-jwt-token-123',
        expect.any(Object),
      );
      expect(authService.formatLoginResponse).toHaveBeenCalledWith(
        adminLoginDataUser,
      );
      expect(result).toEqual(adminLoginResponse);
    });

    it('should set secure cookie in production environment', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      controller.loginLocal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'mock-jwt-token-123',
        {
          httpOnly: true,
          secure: true, // Should be true in production
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 5,
        },
      );

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle multiple roles user', () => {
      const multiRoleUser = {
        ...mockUser,
        role: ['admin', 'user'] as Role[],
      } as unknown as User;

      const multiRoleLoginDataUser: LoginDataUser = {
        ...mockLoginDataUser,
        role: ['admin', 'user'] as Role[],
      };

      const multiRoleLoginData: LoginData = {
        accessToken: 'multi-role-jwt-token',
        user: multiRoleLoginDataUser,
      };

      const multiRoleLoginResponse: LoginResponse = {
        ...mockLoginResponse,
        data: {
          user: multiRoleLoginDataUser,
        },
      };

      mockRequest.user = multiRoleUser;

      authService.generateJWTAuth.mockReturnValue(multiRoleLoginData);
      authService.formatLoginResponse.mockReturnValue(multiRoleLoginResponse);

      const result = controller.loginLocal(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(authService.generateJWTAuth).toHaveBeenCalledWith(multiRoleUser);
      expect(result.data.user.role).toEqual(['admin', 'user']);
    });

    it('should pass through service responses without modification', () => {
      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      const result = controller.loginLocal(
        mockRequest as Request,
        mockResponse as Response,
      );

      // Verify controller doesn't modify service responses
      expect(result).toBe(mockLoginResponse);
      expect(authService.generateJWTAuth).toHaveBeenCalledTimes(1);
      expect(authService.formatLoginResponse).toHaveBeenCalledTimes(1);
    });

    it('should set cookie with correct maxAge (5 days)', () => {
      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      controller.loginLocal(mockRequest as Request, mockResponse as Response);

      const expectedMaxAge = 1000 * 60 * 60 * 24 * 5; // 5 days in milliseconds
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          maxAge: expectedMaxAge,
        }),
      );
    });

    it('should extract user from request correctly', () => {
      const customUser = {
        ...mockUser,
        email: 'custom@example.com',
        name: 'Jane',
        lastName: 'Smith',
      } as unknown as User;

      mockRequest.user = customUser;

      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      controller.loginLocal(mockRequest as Request, mockResponse as Response);

      expect(authService.generateJWTAuth).toHaveBeenCalledWith(customUser);
    });

    it('should maintain cookie security settings', () => {
      authService.generateJWTAuth.mockReturnValue(mockLoginData);
      authService.formatLoginResponse.mockReturnValue(mockLoginResponse);

      controller.loginLocal(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE_NAME,
        'mock-jwt-token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        }),
      );
    });
  });
});
