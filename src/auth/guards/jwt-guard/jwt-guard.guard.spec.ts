/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt-guard.guard';
import config from '@/config';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockConfigService: any;

  const mockConfig = {
    auth: {
      publicKey: 'isPublic',
      jwtKey: 'test-jwt-key',
      roleKey: 'roles',
      oneTimeJwtKey: 'test-one-time-jwt-key',
    },
  };

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtGuard,
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

    guard = module.get<JwtGuard>(JwtGuard);
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

    beforeEach(() => {
      mockExecutionContext = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
      } as any;
    });

    it('should return true for public routes', () => {
      reflector.get.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith(
        'isPublic',
        mockExecutionContext.getHandler(),
      );
    });

    it('should check reflector for public metadata using correct key', () => {
      reflector.get.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.get).toHaveBeenCalledWith(
        mockConfigService.auth.publicKey,
        mockExecutionContext.getHandler(),
      );
    });

    it('should call parent canActivate when route is not public', () => {
      reflector.get.mockReturnValue(false);

      // Mock the parent's canActivate method
      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(reflector.get).toHaveBeenCalledWith(
        'isPublic',
        mockExecutionContext.getHandler(),
      );
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should handle undefined public metadata', () => {
      reflector.get.mockReturnValue(undefined);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.get).toHaveBeenCalledWith(
        'isPublic',
        mockExecutionContext.getHandler(),
      );
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should handle null public metadata', () => {
      reflector.get.mockReturnValue(null);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.get).toHaveBeenCalledWith(
        'isPublic',
        mockExecutionContext.getHandler(),
      );
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should handle false public metadata', () => {
      reflector.get.mockReturnValue(false);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.get).toHaveBeenCalledWith(
        'isPublic',
        mockExecutionContext.getHandler(),
      );
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should use handler from execution context', () => {
      const mockHandler = jest.fn();
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      reflector.get.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(mockExecutionContext.getHandler).toHaveBeenCalled();
      expect(reflector.get).toHaveBeenCalledWith('isPublic', mockHandler);
    });

    it('should be instance of JwtGuard', () => {
      expect(guard).toBeInstanceOf(JwtGuard);
    });

    it('should have canActivate method', () => {
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should return result from parent when not public and parent returns boolean', () => {
      reflector.get.mockReturnValue(false);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(false);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(false);

      parentCanActivate.mockRestore();
    });

    it('should return result from parent when not public and parent returns promise', async () => {
      reflector.get.mockReturnValue(false);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(Promise.resolve(true));

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);

      parentCanActivate.mockRestore();
    });

    it('should correctly identify public routes with truthy values', () => {
      reflector.get.mockReturnValue('true'); // String truthy value

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });

    it('should correctly identify non-public routes with falsy values', () => {
      reflector.get.mockReturnValue(''); // Empty string (falsy)

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });
  });
});
