import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  CREATE_GUIDE_MANUABLE_ENDPOINT,
  MANUABLE_ERROR_MISSING_EMAIL,
  MANUABLE_ERROR_MISSING_PWD,
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_ERROR_UNAUTHORIZED,
  MANUABLE_FAILED_CREATE_GUIDE,
  MANUABLE_FAILED_CREATE_TOKEN,
  MANUABLE_FAILED_FETCH_GUIDES,
  MANUABLE_FAILED_FETCH_QUOTES,
  MANUABLE_MISSING_PROVIDER_PROFIT_MARGIN,
  MANUABLE_TOKEN_ENDPOINT,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';
import {
  CreateGuideManuableResponse,
  CreateGuideMnDataResponse,
  CreateGuideMnRequest,
  CreateManuableguideResponse,
  FetchGuidesManuableResponse,
  FetchManuableQuotesResponse,
  GetGuidesMnDataResponse,
  GetHistoryGuidesPayload,
  GetManuableGuideResponse,
  GetManuableQuoteResponse,
  GetManuableSessionResponse,
  ManuablePayload,
} from '../manuable.interface';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import {
  formatManuableQuote,
  formatPayloadManuable,
  formatPayloadRequestMn,
} from '../manuable.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';
import { PROD_ENV } from '@/app.constant';
import {
  TokenManagerService,
  TokenOperations,
} from '@/token-manager/services/token-manager.service';

@Injectable()
export class ManuableService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private generalInfoDbService: GeneralInfoDbService,
    private tokenManagerService: TokenManagerService,
  ) {}

  /**
   * This service is to get a new token for Manuable API.
   */
  async getManuableSession() {
    try {
      // something
      const { email, pwd, uri } = this.configService.manuable;
      if (!email) throw new BadRequestException(MANUABLE_ERROR_MISSING_EMAIL);
      if (!pwd) throw new BadRequestException(MANUABLE_ERROR_MISSING_PWD);
      if (!uri) throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);

      const payload = {
        email,
        password: pwd,
      };

      const url = `${uri}${MANUABLE_TOKEN_ENDPOINT}`;
      const response: AxiosResponse<GetManuableSessionResponse, unknown> =
        await axios.post(url, payload);
      const token = response?.data?.token;
      return token;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service is to format default payload to fetch quotes
   */
  formatManuablePayload(payload: GetQuoteDto) {
    return formatPayloadManuable(payload);
  }

  /**
   * This service is to get quotes from Manuable API.
   * a: If the service gets and unauthorized error,
   * then attempt to replace the token and refetch the quotes
   * b: Fetch quotes
   */
  async retrieveManuableQuotes(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    const { result: quotes, messages } =
      await this.executeWithRetryOnUnauthorized(
        () =>
          this.getManuableQuote(payload).then((res) => ({
            messages: res.messages,
            result: res.quotes,
          })),
        async (token) => {
          const manuablePayload = this.formatManuablePayload(payload);
          const quotes = await this.fetchManuableQuotes(manuablePayload, token);
          const formattedQuotes = formatManuableQuote(quotes);
          return formattedQuotes;
        },
        'quote retrieval',
      );

    const { quotes: quotesCalculated, messages: updatedMessages } =
      calculateTotalQuotes({
        quotes,
        provider: 'Mn',
        config,
        messages: [],
        providerNotFoundMessage: MANUABLE_MISSING_PROVIDER_PROFIT_MARGIN,
      });
    messages.push(...updatedMessages);
    return {
      quotes: quotesCalculated,
      messages,
    };
  }

  /**
   * This service responds to guide creation from the controller via Mn
   */
  async createGuideWithAutoRetry(
    payload: CreateGuideMnRequest,
  ): Promise<CreateGuideMnDataResponse> {
    try {
      const { result: guide, messages } =
        await this.executeWithRetryOnUnauthorized(
          () =>
            this.createGuideWithUnauthorized(payload).then((res) => ({
              messages: res.messages,
              result: res.guide,
            })),
          async (token) => {
            const guide = await this.createGuide(payload, token);
            return guide;
          },
          'guide creation',
        );
      const npmVersion: string = this.configService.version!;
      return {
        version: npmVersion,
        message: null,
        messages,
        error: null,
        data: {
          guide,
        },
      };
    } catch (error) {
      console.log(error);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service responds to get history guide from the controller via Mn
   */
  async getHistoryGuidesWithAutoRetry(
    payload: GetHistoryGuidesPayload,
  ): Promise<GetGuidesMnDataResponse> {
    try {
      const { result: guides, messages } =
        await this.executeWithRetryOnUnauthorized(
          () =>
            this.getManuableHistoryGuidesWithUnauthorized(payload).then(
              (res) => ({
                messages: res.messages,
                result: res.guides,
              }),
            ),
          async (token) => {
            const guides = await this.fetchManuableHistoryGuides(
              payload,
              token,
            );
            return guides;
          },
          'get guides',
        );
      const npmVersion: string = this.configService.version!;
      return {
        version: npmVersion,
        message: null,
        messages,
        error: null,
        data: {
          guides,
        },
      };
    } catch (error) {
      console.log(error);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * Returns token operations for Manuable API integration with TokenManagerService
   */
  private getManuableTokenOperations(): TokenOperations {
    return {
      createNewToken: async () => {
        const token = await this.getManuableSession();
        if (!token) {
          throw new BadRequestException(MANUABLE_FAILED_CREATE_TOKEN);
        }
        return token;
      },
      updateStoredToken: async (token: string, isProd: boolean) => {
        await this.generalInfoDbService.updateMnToken({ token, isProd });
      },
      getStoredToken: async (isProd: boolean) => {
        return await this.generalInfoDbService.getMnTk({ isProd });
      },
    };
  }

  /**
   * Generic helper to execute Manuable API operations with automatic token management.
   * Uses TokenManagerService for consistent token handling across providers.
   */
  private async executeWithManuableToken<T>(
    operation: (token: string) => Promise<T>,
    operationName: string,
  ): Promise<{ result: T; messages: string[] }> {
    const env = this.configService.environment;
    const isProd = env === PROD_ENV;

    return this.tokenManagerService.executeWithTokenManagement(
      operation,
      operationName,
      isProd,
      this.getManuableTokenOperations(),
      'Mn',
    );
  }

  /**
   * Generic helper to execute operations that return unauthorized messages and need retry logic.
   * Uses TokenManagerService for consistent retry behavior across providers.
   */
  private async executeWithRetryOnUnauthorized<T, R>(
    initialOperation: () => Promise<{ messages: string[]; result: T }>,
    retryOperation: (token: string) => Promise<R>,
    operationName: string,
  ): Promise<{ messages: string[]; result: T | R }> {
    const env = this.configService.environment;
    const isProd = env === PROD_ENV;

    return this.tokenManagerService.executeWithRetryOnUnauthorized(
      initialOperation,
      retryOperation,
      operationName,
      MANUABLE_ERROR_UNAUTHORIZED,
      this.getManuableTokenOperations(),
      isProd,
      'Mn',
    );
  }

  /**
   * This service is to get quotes from Manuable API by:
   * 1. Getting token
   * 2-a: If the token does not exist, create it and fetch quotes
   * 2-b: Fetch quotes and return them.
   * The result can return an unauthorized error or the quotes
   */
  async getManuableQuote(
    payload: GetQuoteDto,
  ): Promise<GetManuableQuoteResponse> {
    try {
      const formattedPayload = this.formatManuablePayload(payload);

      const { result: quotes, messages } = await this.executeWithManuableToken(
        (token) => this.fetchManuableQuotes(formattedPayload, token),
        'quote fetching',
      );

      if (!quotes) {
        messages.push(`Mn: ${MANUABLE_FAILED_FETCH_QUOTES}`);
        return {
          messages,
          quotes: [],
        };
      }

      const formattedQuotes = formatManuableQuote(quotes);
      return {
        messages,
        quotes: formattedQuotes,
      };
    } catch (error) {
      const messages: string[] = [];
      if (error instanceof Error) {
        // The service fetchManuableQuotes returned 401 Unauthorized
        if (error?.message === 'Request failed with status code 401') {
          messages.push(MANUABLE_ERROR_UNAUTHORIZED);
          return {
            messages,
            quotes: [],
          };
        }

        messages.push(`Mn: ${error.message}`);
        return {
          messages,
          quotes: [],
        };
      }

      messages.push('Mn: An unknown error occurred');
      return {
        messages,
        quotes: [],
      };
    }
  }

  /**
   * This service is to get quotes from Manuable API by:
   * 1. Getting token
   * 2-a: If the token does not exist, create it and fetch quotes
   * 2-b: Fetch quotes and return them.
   * The result can return an unauthorized error or the quotes
   */
  async getManuableHistoryGuidesWithUnauthorized(
    payload: GetHistoryGuidesPayload,
  ): Promise<FetchGuidesManuableResponse> {
    try {
      const { result: guides, messages } = await this.executeWithManuableToken(
        (token) => this.fetchManuableHistoryGuides(payload, token),
        'guides fetching',
      );

      if (!guides) {
        messages.push(`Mn: ${MANUABLE_FAILED_FETCH_GUIDES}`);
        return {
          messages,
          guides: [],
        };
      }

      return {
        messages,
        guides,
      };
    } catch (error) {
      const messages: string[] = [];
      if (error instanceof Error) {
        // The service fetchManuableQuotes returned 401 Unauthorized
        if (error?.message === 'Request failed with status code 401') {
          messages.push(MANUABLE_ERROR_UNAUTHORIZED);
          return {
            messages,
            guides: [],
          };
        }

        messages.push(`Mn: ${error.message}`);
        return {
          messages,
          guides: [],
        };
      }

      messages.push('Mn: An unknown error occurred');
      return {
        messages,
        guides: [],
      };
    }
  }

  /**
   * This service is to get quotes from Manuable API by:
   * 1. Getting token
   * 2-a: If the token does not exist, create it and create guide
   * 2-b: Create guide and return them.
   * The result can return an unauthorized error or the quotes
   */
  async createGuideWithUnauthorized(
    payload: CreateGuideMnRequest,
  ): Promise<CreateGuideManuableResponse> {
    try {
      const { result: guide, messages } = await this.executeWithManuableToken(
        (token) => this.createGuide(payload, token),
        'guide creation',
      );

      if (!guide) {
        messages.push(`Mn: ${MANUABLE_FAILED_CREATE_GUIDE}`);
        return {
          messages,
          guide: null,
        };
      }

      return {
        messages,
        guide,
      };
    } catch (error) {
      const messages: string[] = [];
      if (error instanceof Error) {
        // The service createGuide returned 401 Unauthorized
        if (error?.message === 'Request failed with status code 401') {
          messages.push(MANUABLE_ERROR_UNAUTHORIZED);
          return {
            messages,
            guide: null,
          };
        }

        messages.push(`Mn: ${error.message}`);
        return {
          messages,
          guide: null,
        };
      }

      messages.push('Mn: An unknown error occurred');
      return {
        messages,
        guide: null,
      };
    }
  }

  /**
   * This service is meant when the token does not exist in the database
   */
  async createToken() {
    try {
      const env = this.configService.environment;
      const isProd = env === PROD_ENV;
      const token = await this.getManuableSession();
      if (!token) {
        throw new BadRequestException(MANUABLE_FAILED_CREATE_TOKEN);
      }
      const updatedConfig = await this.generalInfoDbService.updateMnToken({
        token,
        isProd,
      });
      return {
        mnTk: isProd
          ? updatedConfig.mnConfig.tkProd
          : updatedConfig.mnConfig.tkDev,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service is to generate a new token and replace the expired old token.
   */
  async updateOldToken() {
    try {
      const env = this.configService.environment;
      const isProd = env === PROD_ENV;

      // 1. Create new token
      const token = await this.getManuableSession();
      if (!token) {
        throw new BadRequestException(MANUABLE_FAILED_CREATE_TOKEN);
      }

      // 2. Update token using the new method
      await this.generalInfoDbService.updateMnToken({
        token,
        isProd,
      });

      return token;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service is to fetch quotes from Manuable API.
   */
  async fetchManuableQuotes(payload: ManuablePayload, token: string) {
    try {
      const { uri } = this.configService.manuable;
      if (!uri) {
        throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);
      }

      const url = `${uri}${QUOTE_MANUABLE_ENDPOINT}`;
      const response: AxiosResponse<FetchManuableQuotesResponse, unknown> =
        await axios.post(url, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      const quotes = response?.data?.data;
      return quotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * This service is to fetch quotes from Manuable API.
   */
  async fetchManuableHistoryGuides(
    payload: GetHistoryGuidesPayload,
    token: string,
  ) {
    try {
      const { uri } = this.configService.manuable;
      if (!uri) {
        throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);
      }
      const trackingNumber = payload.tracking_number;

      const url = `${uri}${CREATE_GUIDE_MANUABLE_ENDPOINT}`;
      const updatedUrl = trackingNumber
        ? `${url}?tracking_number=${trackingNumber}`
        : url;
      const response: AxiosResponse<GetManuableGuideResponse, unknown> =
        await axios.get(updatedUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      const guides = response?.data?.data;
      return guides;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createGuide(payload: CreateGuideMnRequest, token: string) {
    try {
      const { uri } = this.configService.manuable;
      if (!uri) {
        throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);
      }
      const updatedPayload = formatPayloadRequestMn(payload);

      const url = `${uri}${CREATE_GUIDE_MANUABLE_ENDPOINT}`;
      const response: AxiosResponse<CreateManuableguideResponse, unknown> =
        await axios.post(url, updatedPayload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      const guide = response?.data?.data;
      return guide;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
