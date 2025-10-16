/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '@/users/users.interface';
import { User } from '@/users/entities/users.entity';
import config from '@/config';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockConfigService: any;

  const mockConfig = {
    auth: {
      roleKey: 'roles',
      jwtKey: 'test-jwt-key',
      publicKey: 'test-public-key',
      oneTimeJwtKey: 'test-one-time-jwt-key',
    },
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: config.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
    mockConfigService = module.get(config.KEY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockRequest: { user: User };

    beforeEach(() => {
      mockRequest = {
        user: {
          _id: 'userId123',
          email: 'test@example.com',
          name: 'John',
          lastName: 'Doe',
          role: ['user'] as Role[],
          password: 'hashedPassword',
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
        } as unknown as User,
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    });

    it('should return true when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should return true when user has required role', () => {
      const requiredRoles: Role[] = ['user'];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('roles', [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should return true when user has all required roles', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = ['admin', 'user'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return true when user has multiple roles and all are required', () => {
      const requiredRoles: Role[] = ['admin', 'user'];
      mockRequest.user.role = ['admin', 'user'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      const requiredRoles: Role[] = ['admin'];
      mockRequest.user.role = ['user'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should return false when user has some but not all required roles', () => {
      const requiredRoles: Role[] = ['admin', 'user'];
      mockRequest.user.role = ['admin'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle user with single role as string', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = 'user' as any; // Simulate single role as string
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should handle user with no roles', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = null as any;
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle user with undefined roles', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = undefined as any;
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle empty roles array', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = [] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should use correct role key from config', () => {
      const requiredRoles: Role[] = ['user'];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        mockConfigService.auth.roleKey,
        [mockExecutionContext.getHandler(), mockExecutionContext.getClass()],
      );
    });

    it('should get user from request context correctly', () => {
      const requiredRoles: Role[] = ['user'];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      guard.canActivate(mockExecutionContext);

      expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
      expect(mockExecutionContext.switchToHttp().getRequest).toHaveBeenCalled();
    });

    it('should handle admin user accessing user-only endpoint', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = ['admin'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);
    });

    it('should handle user with extra roles accessing specific endpoint', () => {
      const requiredRoles: Role[] = ['user'];
      mockRequest.user.role = ['admin', 'user', 'moderator'] as Role[];
      reflector.getAllAndOverride.mockReturnValue(requiredRoles);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
