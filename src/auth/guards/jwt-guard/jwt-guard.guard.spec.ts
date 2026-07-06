/* eslint-disable @typescript-eslint/unbound-method */

/* eslint-disable @typescript-eslint/no-floating-promises */
jest.mock('passport', () => ({
  _strategies: {},
  authenticate: jest.fn(
    () =>
      (
        _req: unknown,
        _res: unknown,
        next: (err: null, user: unknown) => void,
      ) =>
        next(null, {}),
  ),
  use: function (name: string) {
    (this._strategies as Record<string, unknown>)[name] = {};
  },
  get: function (name: string) {
    return (this._strategies as Record<string, unknown>)[name];
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt-guard.guard';
import { IS_PUBLIC_KEY } from '@/auth/auth.constant';
import config from '@/config';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      get: jest.fn(),
      getAllAndOverride: jest.fn(),
    };

    const mockConfigService = {
      auth: { publicKey: IS_PUBLIC_KEY },
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
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<JwtGuard>(JwtGuard);
    reflector = module.get(Reflector);
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
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({}),
          getResponse: jest.fn().mockReturnValue({}),
        }),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
      };
    });

    it('should return true for public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it('should call parent canActivate when route is not public', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      // Mock the parent's canActivate method
      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      const result = guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should handle undefined public metadata', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should handle null public metadata', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const parentCanActivate = jest
        .spyOn(
          Object.getPrototypeOf(Object.getPrototypeOf(guard)),
          'canActivate',
        )
        .mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
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

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
      expect(parentCanActivate).toHaveBeenCalledWith(mockExecutionContext);

      parentCanActivate.mockRestore();
    });

    it('should use handler and class from execution context', () => {
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getClass.mockReturnValue(mockClass);
      reflector.getAllAndOverride.mockReturnValue(true);

      guard.canActivate(mockExecutionContext);

      expect(mockExecutionContext.getHandler).toHaveBeenCalled();
      expect(mockExecutionContext.getClass).toHaveBeenCalled();
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
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
      reflector.getAllAndOverride.mockReturnValue(true); // Boolean true

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
