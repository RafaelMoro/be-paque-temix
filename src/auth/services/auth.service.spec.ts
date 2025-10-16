import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '@/users/services/users.service';
import { UserDoc } from '@/users/entities/users.entity';
import { LoginDataUser, Role } from '@/users/users.interface';
import { LoginResponse } from '../auth.interface';
import config from '@/config';
import * as authUtils from '../auth.utils';

// Mock bcrypt
jest.mock('bcryptjs');

// Mock auth utils
jest.mock('../auth.utils');

// Mock the entire UsersService module to avoid email dependencies
jest.mock('@/users/services/users.service', () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    findByEmail: jest.fn(),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockConfig = {
    version: '1.0.0',
    auth: {
      jwtKey: 'test-jwt-key',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mockGenerateJWTUser = {
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    role: ['user'] as Role[],
    // Add minimal required properties for User type
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
  } as any; // Cast to any to avoid full User interface requirements

  const mockUserDoc = {
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    role: ['user'] as Role[],
    password: 'hashedPassword123',
    toJSON: jest.fn().mockReturnValue({
      email: 'test@example.com',
      name: 'John',
      lastName: 'Doe',
      role: ['user'] as Role[],
      password: 'hashedPassword123',
    }),
  } as unknown as UserDoc;

  const mockLoginDataUser: LoginDataUser = {
    email: 'test@example.com',
    name: 'John',
    lastName: 'Doe',
    role: ['user'] as Role[],
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePasswordOfUser', () => {
    it('should return user data when email and password are valid', async () => {
      // Mock user found
      usersService.findByEmail.mockResolvedValue(mockUserDoc);

      // Mock bcrypt compare to return true
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePasswordOfUser(
        'test@example.com',
        'password123',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockUserDoc.toJSON).toHaveBeenCalled();
      expect(result).toEqual({
        name: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        role: ['user'],
      });
    });

    it('should return null when user is not found', async () => {
      // Mock user not found
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validatePasswordOfUser(
        'nonexistent@example.com',
        'password123',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      // Mock user found
      usersService.findByEmail.mockResolvedValue(mockUserDoc);

      // Mock bcrypt compare to return false
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePasswordOfUser(
        'test@example.com',
        'wrongPassword',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongPassword',
        'hashedPassword123',
      );
      expect(result).toBeNull();
    });

    it('should handle bcrypt comparison errors', async () => {
      // Mock user found
      usersService.findByEmail.mockResolvedValue(mockUserDoc);

      // Mock bcrypt compare to throw error
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );

      await expect(
        service.validatePasswordOfUser('test@example.com', 'password123'),
      ).rejects.toThrow('Bcrypt error');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashedPassword123',
      );
    });
  });

  describe('generateJWTAuth', () => {
    it('should generate JWT token and return login data', () => {
      const mockAccessToken = 'mock-jwt-token';

      // Mock generateJWT utility function
      (authUtils.generateJWT as jest.Mock).mockReturnValue(mockAccessToken);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = service.generateJWTAuth(mockGenerateJWTUser);

      expect(authUtils.generateJWT).toHaveBeenCalledWith(
        mockGenerateJWTUser,
        jwtService,
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
        user: {
          email: 'test@example.com',
          name: 'John',
          lastName: 'Doe',
          role: ['user'],
        },
      });
    });

    it('should handle admin user role', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const adminUser = {
        ...mockGenerateJWTUser,
        role: ['admin'] as Role[],
      };

      const mockAccessToken = 'mock-admin-jwt-token';

      // Mock generateJWT utility function
      (authUtils.generateJWT as jest.Mock).mockReturnValue(mockAccessToken);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = service.generateJWTAuth(adminUser);

      expect(authUtils.generateJWT).toHaveBeenCalledWith(adminUser, jwtService);
      expect(result).toEqual({
        accessToken: mockAccessToken,
        user: {
          email: 'test@example.com',
          name: 'John',
          lastName: 'Doe',
          role: ['admin'],
        },
      });
    });

    it('should handle multiple roles', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const multiRoleUser = {
        ...mockGenerateJWTUser,
        role: ['admin', 'user'] as Role[],
      };

      const mockAccessToken = 'mock-multi-role-jwt-token';

      // Mock generateJWT utility function
      (authUtils.generateJWT as jest.Mock).mockReturnValue(mockAccessToken);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = service.generateJWTAuth(multiRoleUser);

      expect(authUtils.generateJWT).toHaveBeenCalledWith(
        multiRoleUser,
        jwtService,
      );
      expect(result.user.role).toEqual(['admin', 'user']);
    });
  });

  describe('formatLoginResponse', () => {
    it('should format login response with correct structure', () => {
      const result = service.formatLoginResponse(mockLoginDataUser);

      const expectedResponse: LoginResponse = {
        version: '1.0.0',
        message: null,
        data: {
          user: mockLoginDataUser,
        },
        error: null,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should use version from config service', () => {
      const result = service.formatLoginResponse(mockLoginDataUser);

      expect(result.version).toBe('1.0.0');
      expect(result.message).toBeNull();
      expect(result.error).toBeNull();
      expect(result.data.user).toEqual(mockLoginDataUser);
    });

    it('should handle admin user in login response', () => {
      const adminLoginUser: LoginDataUser = {
        ...mockLoginDataUser,
        role: ['admin'] as Role[],
      };

      const result = service.formatLoginResponse(adminLoginUser);

      expect(result.data.user.role).toEqual(['admin']);
      expect(result.version).toBe('1.0.0');
    });

    it('should maintain response structure integrity', () => {
      const result = service.formatLoginResponse(mockLoginDataUser);

      // Verify response structure
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(result.data).toHaveProperty('user');

      // Verify types
      expect(typeof result.version).toBe('string');
      expect(result.message).toBeNull();
      expect(result.error).toBeNull();
      expect(typeof result.data.user).toBe('object');
    });
  });
});
