import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TokenManagerService, TokenOperations } from './token-manager.service';

describe('TokenManagerService', () => {
  let service: TokenManagerService;
  let mockTokenOperations: jest.Mocked<TokenOperations>;

  beforeEach(async () => {
    // Create mock TokenOperations
    mockTokenOperations = {
      createNewToken: jest.fn(),
      updateStoredToken: jest.fn(),
      getStoredToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenManagerService],
    }).compile();

    service = module.get<TokenManagerService>(TokenManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeWithTokenManagement', () => {
    const mockOperation = jest.fn();
    const operationName = 'testOperation';
    const isProd = false;
    const providerPrefix = 'TestProvider';

    beforeEach(() => {
      mockOperation.mockClear();
    });

    it('should create new token and execute operation when no token exists', async () => {
      // Arrange
      const newToken = 'new-token-123';
      const operationResult = { data: 'success' };

      mockTokenOperations.getStoredToken.mockResolvedValue(null);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockOperation.mockResolvedValue(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
        providerPrefix,
      );

      // Assert
      expect(mockTokenOperations.getStoredToken).toHaveBeenCalledWith(isProd);
      expect(mockTokenOperations.createNewToken).toHaveBeenCalled();
      expect(mockTokenOperations.updateStoredToken).toHaveBeenCalledWith(
        newToken,
        isProd,
      );
      expect(mockOperation).toHaveBeenCalledWith(newToken);
      expect(result.result).toBe(operationResult);
      expect(result.messages).toContain(
        `${providerPrefix}: Creating token for ${operationName}`,
      );
      expect(result.messages).toContain(
        `${providerPrefix}: ${operationName} completed successfully`,
      );
    });

    it('should use existing valid token successfully', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const operationResult = { data: 'success' };

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockOperation.mockResolvedValue(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
        providerPrefix,
      );

      // Assert
      expect(mockTokenOperations.getStoredToken).toHaveBeenCalledWith(isProd);
      expect(mockTokenOperations.createNewToken).not.toHaveBeenCalled();
      expect(mockTokenOperations.updateStoredToken).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledWith(existingToken);
      expect(result.result).toBe(operationResult);
      expect(result.messages).toContain(`${providerPrefix}: Token valid`);
      expect(result.messages).toContain(
        `${providerPrefix}: ${operationName} completed successfully`,
      );
    });

    it('should retry with new token on 401 error (message)', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const newToken = 'new-token-789';
      const operationResult = { data: 'success' };
      const unauthorizedError = new Error(
        'Request failed with status code 401',
      );

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockOperation
        .mockRejectedValueOnce(unauthorizedError)
        .mockResolvedValueOnce(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
        providerPrefix,
      );

      // Assert
      expect(mockTokenOperations.getStoredToken).toHaveBeenCalledWith(isProd);
      expect(mockTokenOperations.createNewToken).toHaveBeenCalled();
      expect(mockTokenOperations.updateStoredToken).toHaveBeenCalledWith(
        newToken,
        isProd,
      );
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockOperation).toHaveBeenNthCalledWith(1, existingToken);
      expect(mockOperation).toHaveBeenNthCalledWith(2, newToken);
      expect(result.result).toBe(operationResult);
      expect(result.messages).toContain(
        `${providerPrefix}: Token expired, creating new token for ${operationName}`,
      );
      expect(result.messages).toContain(
        `${providerPrefix}: ${operationName} completed successfully with new token`,
      );
    });

    it('should retry with new token on 401 error (statusCode)', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const newToken = 'new-token-789';
      const operationResult = { data: 'success' };
      const unauthorizedError = Object.assign(new Error('Unauthorized'), {
        statusCode: 401,
      });

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockOperation
        .mockRejectedValueOnce(unauthorizedError)
        .mockResolvedValueOnce(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
        providerPrefix,
      );

      // Assert
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.result).toBe(operationResult);
      expect(result.messages).toContain(
        `${providerPrefix}: Token expired, creating new token for ${operationName}`,
      );
    });

    it('should retry with new token on 401 error (response.status)', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const newToken = 'new-token-789';
      const operationResult = { data: 'success' };
      const unauthorizedError = Object.assign(new Error('HTTP Error'), {
        response: { status: 401 },
      });

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockOperation
        .mockRejectedValueOnce(unauthorizedError)
        .mockResolvedValueOnce(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
        providerPrefix,
      );

      // Assert
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(result.result).toBe(operationResult);
      expect(result.messages).toContain(
        `${providerPrefix}: Token expired, creating new token for ${operationName}`,
      );
    });

    it('should throw non-401 errors without retry', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const nonUnauthorizedError = new Error('Some other error');

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockOperation.mockRejectedValue(nonUnauthorizedError);

      // Act & Assert
      await expect(
        service.executeWithTokenManagement(
          mockOperation,
          operationName,
          isProd,
          mockTokenOperations,
          providerPrefix,
        ),
      ).rejects.toThrow('Some other error');

      expect(mockTokenOperations.createNewToken).not.toHaveBeenCalled();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle token creation failure', async () => {
      // Arrange
      const tokenCreationError = new Error('Token creation failed');

      mockTokenOperations.getStoredToken.mockResolvedValue(null);
      mockTokenOperations.createNewToken.mockRejectedValue(tokenCreationError);

      // Act & Assert
      await expect(
        service.executeWithTokenManagement(
          mockOperation,
          operationName,
          isProd,
          mockTokenOperations,
          providerPrefix,
        ),
      ).rejects.toThrow('Token creation failed');

      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should work without provider prefix', async () => {
      // Arrange
      const existingToken = 'existing-token-456';
      const operationResult = { data: 'success' };

      mockTokenOperations.getStoredToken.mockResolvedValue(existingToken);
      mockOperation.mockResolvedValue(operationResult);

      // Act
      const result = await service.executeWithTokenManagement(
        mockOperation,
        operationName,
        isProd,
        mockTokenOperations,
      );

      // Assert
      expect(result.messages).toContain('Token valid');
      expect(result.messages).toContain(
        `${operationName} completed successfully`,
      );
      expect(result.messages.every((msg) => !msg.startsWith(': '))).toBe(true);
    });

    it('should handle unknown errors and convert to BadRequestException', async () => {
      // Arrange
      const unknownError = 'string error';

      mockTokenOperations.getStoredToken.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        service.executeWithTokenManagement(
          mockOperation,
          operationName,
          isProd,
          mockTokenOperations,
          providerPrefix,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('executeWithRetryOnUnauthorized', () => {
    const mockInitialOperation = jest.fn();
    const mockRetryOperation = jest.fn();
    const operationName = 'testRetryOperation';
    const unauthorizedErrorConstant = 'UNAUTHORIZED_ERROR';
    const isProd = true;
    const providerPrefix = 'RetryProvider';

    beforeEach(() => {
      mockInitialOperation.mockClear();
      mockRetryOperation.mockClear();
    });

    it('should return initial operation result when successful', async () => {
      // Arrange
      const initialResult = { data: 'initial success' };
      const initialResponse = {
        messages: ['Operation started', 'Operation completed'],
        result: initialResult,
      };

      mockInitialOperation.mockResolvedValue(initialResponse);

      // Act
      const result = await service.executeWithRetryOnUnauthorized(
        mockInitialOperation,
        mockRetryOperation,
        operationName,
        unauthorizedErrorConstant,
        mockTokenOperations,
        isProd,
        providerPrefix,
      );

      // Assert
      expect(mockInitialOperation).toHaveBeenCalled();
      expect(mockRetryOperation).not.toHaveBeenCalled();
      expect(mockTokenOperations.createNewToken).not.toHaveBeenCalled();
      expect(result.result).toBe(initialResult);
      expect(result.messages).toEqual(initialResponse.messages);
    });

    it('should retry with new token when unauthorized error is detected', async () => {
      // Arrange
      const initialResult = { data: 'initial result' };
      const initialResponse = {
        messages: [
          'Operation started',
          unauthorizedErrorConstant,
          'Operation failed',
        ],
        result: initialResult,
      };
      const retryResult = { data: 'retry success' };
      const newToken = 'retry-token-123';

      mockInitialOperation.mockResolvedValue(initialResponse);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockRetryOperation.mockResolvedValue(retryResult);

      // Act
      const result = await service.executeWithRetryOnUnauthorized(
        mockInitialOperation,
        mockRetryOperation,
        operationName,
        unauthorizedErrorConstant,
        mockTokenOperations,
        isProd,
        providerPrefix,
      );

      // Assert
      expect(mockInitialOperation).toHaveBeenCalled();
      expect(mockTokenOperations.createNewToken).toHaveBeenCalled();
      expect(mockTokenOperations.updateStoredToken).toHaveBeenCalledWith(
        newToken,
        isProd,
      );
      expect(mockRetryOperation).toHaveBeenCalledWith(newToken);
      expect(result.result).toBe(retryResult);
      expect(result.messages).toContain(
        `${providerPrefix}: Attempting to retry ${operationName} with a new token`,
      );
      expect(result.messages).toContain(
        `${providerPrefix}: ${operationName} completed successfully`,
      );
    });

    it('should handle token creation failure during retry', async () => {
      // Arrange
      const initialResponse = {
        messages: [unauthorizedErrorConstant],
        result: { data: 'initial' },
      };
      const tokenCreationError = new Error('Token creation failed');

      mockInitialOperation.mockResolvedValue(initialResponse);
      mockTokenOperations.createNewToken.mockRejectedValue(tokenCreationError);

      // Act & Assert
      await expect(
        service.executeWithRetryOnUnauthorized(
          mockInitialOperation,
          mockRetryOperation,
          operationName,
          unauthorizedErrorConstant,
          mockTokenOperations,
          isProd,
          providerPrefix,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle retry operation failure', async () => {
      // Arrange
      const initialResponse = {
        messages: [unauthorizedErrorConstant],
        result: { data: 'initial' },
      };
      const newToken = 'retry-token-123';
      const retryError = new Error('Retry operation failed');

      mockInitialOperation.mockResolvedValue(initialResponse);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockRetryOperation.mockRejectedValue(retryError);

      // Act & Assert
      await expect(
        service.executeWithRetryOnUnauthorized(
          mockInitialOperation,
          mockRetryOperation,
          operationName,
          unauthorizedErrorConstant,
          mockTokenOperations,
          isProd,
          providerPrefix,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle initial operation failure', async () => {
      // Arrange
      const initialError = new Error('Initial operation failed');

      mockInitialOperation.mockRejectedValue(initialError);

      // Act & Assert
      await expect(
        service.executeWithRetryOnUnauthorized(
          mockInitialOperation,
          mockRetryOperation,
          operationName,
          unauthorizedErrorConstant,
          mockTokenOperations,
          isProd,
          providerPrefix,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockRetryOperation).not.toHaveBeenCalled();
    });

    it('should work without provider prefix', async () => {
      // Arrange
      const initialResponse = {
        messages: [unauthorizedErrorConstant],
        result: { data: 'initial' },
      };
      const retryResult = { data: 'retry success' };
      const newToken = 'retry-token-123';

      mockInitialOperation.mockResolvedValue(initialResponse);
      mockTokenOperations.createNewToken.mockResolvedValue(newToken);
      mockTokenOperations.updateStoredToken.mockResolvedValue();
      mockRetryOperation.mockResolvedValue(retryResult);

      // Act
      const result = await service.executeWithRetryOnUnauthorized(
        mockInitialOperation,
        mockRetryOperation,
        operationName,
        unauthorizedErrorConstant,
        mockTokenOperations,
        isProd,
      );

      // Assert
      expect(result.messages).toContain(
        `Attempting to retry ${operationName} with a new token`,
      );
      expect(result.messages).toContain(
        `${operationName} completed successfully`,
      );
      expect(result.messages.every((msg) => !msg.startsWith(': '))).toBe(true);
    });

    it('should handle unknown errors and convert to BadRequestException', async () => {
      // Arrange
      const unknownError = 'string error';

      mockInitialOperation.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(
        service.executeWithRetryOnUnauthorized(
          mockInitialOperation,
          mockRetryOperation,
          operationName,
          unauthorizedErrorConstant,
          mockTokenOperations,
          isProd,
          providerPrefix,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isUnauthorizedError (tested through public methods)', () => {
    const mockOperation = jest.fn();
    const operationName = 'testOperation';
    const isProd = false;

    beforeEach(() => {
      mockOperation.mockClear();
      mockTokenOperations.getStoredToken.mockResolvedValue('existing-token');
      mockTokenOperations.createNewToken.mockResolvedValue('new-token');
      mockTokenOperations.updateStoredToken.mockResolvedValue();
    });

    it('should not treat non-Error objects as unauthorized', async () => {
      // Arrange
      const nonErrorObject = 'string error';
      mockOperation.mockRejectedValue(nonErrorObject);

      // Act & Assert
      await expect(
        service.executeWithTokenManagement(
          mockOperation,
          operationName,
          isProd,
          mockTokenOperations,
        ),
      ).rejects.toThrow();

      // Should not retry, only called once
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockTokenOperations.createNewToken).not.toHaveBeenCalled();
    });

    it('should not treat non-401 errors as unauthorized', async () => {
      // Arrange
      const nonUnauthorizedError = new Error('Some other error');
      mockOperation.mockRejectedValue(nonUnauthorizedError);

      // Act & Assert
      await expect(
        service.executeWithTokenManagement(
          mockOperation,
          operationName,
          isProd,
          mockTokenOperations,
        ),
      ).rejects.toThrow('Some other error');

      // Should not retry, only called once
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockTokenOperations.createNewToken).not.toHaveBeenCalled();
    });
  });
});
