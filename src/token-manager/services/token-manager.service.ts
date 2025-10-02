import { BadRequestException, Injectable } from '@nestjs/common';

export interface TokenOperations {
  createNewToken: () => Promise<string>;
  updateStoredToken: (token: string, isProd: boolean) => Promise<void>;
  getStoredToken: (isProd: boolean) => Promise<string | null>;
}

interface HttpError extends Error {
  statusCode?: number;
  response?: {
    status?: number;
  };
}

function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const httpError = error as HttpError;

  return (
    error.message === 'Request failed with status code 401' ||
    httpError.statusCode === 401 ||
    httpError.response?.status === 401
  );
}

@Injectable()
export class TokenManagerService {
  /**
   * Generic helper to execute API operations with automatic token management.
   * Handles token creation, validation, and 401 retry logic.
   */
  async executeWithTokenManagement<T>(
    operation: (token: string) => Promise<T>,
    operationName: string,
    isProd: boolean,
    tokenOps: TokenOperations,
    providerPrefix: string = '',
  ): Promise<{ result: T; messages: string[] }> {
    const messages: string[] = [];
    const prefix = providerPrefix ? `${providerPrefix}: ` : '';

    try {
      // 1. Get existing token
      const apiKey = await tokenOps.getStoredToken(isProd);

      if (!apiKey) {
        messages.push(`${prefix}Creating token for ${operationName}`);
        const newToken = await tokenOps.createNewToken();
        await tokenOps.updateStoredToken(newToken, isProd);
        const result = await operation(newToken);
        messages.push(`${prefix}${operationName} completed successfully`);
        return { result, messages };
      }

      messages.push(`${prefix}Token valid`);

      try {
        // 2. Try with existing token
        const result = await operation(apiKey);
        messages.push(`${prefix}${operationName} completed successfully`);
        return { result, messages };
      } catch (error) {
        // Handle 401 unauthorized - retry with new token
        if (isUnauthorizedError(error)) {
          messages.push(
            `${prefix}Token expired, creating new token for ${operationName}`,
          );
          const newToken = await tokenOps.createNewToken();
          await tokenOps.updateStoredToken(newToken, isProd);
          const result = await operation(newToken);
          messages.push(
            `${prefix}${operationName} completed successfully with new token`,
          );
          return { result, messages };
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        messages.push(`${prefix}${error.message}`);
        throw error;
      }
      messages.push(
        `${prefix}An unknown error occurred during ${operationName}`,
      );
      throw new BadRequestException(
        `An unknown error occurred during ${operationName}`,
      );
    }
  }

  /**
   * Generic helper to execute operations that return unauthorized messages and need retry logic.
   * Handles the pattern where an operation might return an unauthorized error in messages,
   * requiring a retry with a new token and a fallback operation.
   */
  async executeWithRetryOnUnauthorized<T, R>(
    initialOperation: () => Promise<{ messages: string[]; result: T }>,
    retryOperation: (token: string) => Promise<R>,
    operationName: string,
    unauthorizedErrorConstant: string,
    tokenOps: TokenOperations,
    isProd: boolean,
    providerPrefix: string = '',
  ): Promise<{ messages: string[]; result: T | R }> {
    const prefix = providerPrefix ? `${providerPrefix}: ` : '';

    try {
      const res = await initialOperation();
      const messages: string[] = [...res.messages];

      if (res?.messages.includes(unauthorizedErrorConstant)) {
        messages.push(
          `${prefix}Attempting to retry ${operationName} with a new token`,
        );
        const token = await tokenOps.createNewToken();
        await tokenOps.updateStoredToken(token, isProd);
        const result = await retryOperation(token);

        messages.push(`${prefix}${operationName} completed successfully`);
        return {
          result,
          messages,
        };
      }

      return {
        result: res.result,
        messages,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
