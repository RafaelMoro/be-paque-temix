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
  MANUABLE_FAILED_FETCH_QUOTES,
  MANUABLE_FAILED_TOKEN,
  MANUABLE_MISSING_PROVIDER_PROFIT_MARGIN,
  MANUABLE_TOKEN_ENDPOINT,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';
import {
  CreateGuideManuableResponse,
  CreateGuideMnRequest,
  CreateManuableguideResponse,
  FetchManuableQuotesResponse,
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

@Injectable()
export class ManuableService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private generalInfoDbService: GeneralInfoDbService,
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
    try {
      const res = await this.getManuableQuote(payload);
      const messages: string[] = [...res.messages];

      if (res?.messages.includes(MANUABLE_ERROR_UNAUTHORIZED)) {
        messages.push('Mn: Attempting to re-fetch quotes with a new token');
        const token = await this.updateOldToken();
        const manuablePayload = this.formatManuablePayload(payload);
        const quotes = await this.fetchManuableQuotes(manuablePayload, token);

        messages.push('Mn: Quotes fetched successfully');
        const formattedQuotes = formatManuableQuote(quotes);
        const { quotes: quotesCalculated, messages: updatedMessages } =
          calculateTotalQuotes({
            quotes: formattedQuotes,
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

      const { quotes: quotesCalculated, messages: updatedMessages } =
        calculateTotalQuotes({
          quotes: res?.quotes,
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
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async retrieveManuableGuide(
    payload: CreateGuideMnRequest,
  ): Promise<CreateGuideManuableResponse> {
    try {
      const res = await this.createGuideManuable(payload);
      const messages: string[] = [...res.messages];

      if (res?.messages.includes(MANUABLE_ERROR_UNAUTHORIZED)) {
        messages.push('Mn: Attempting to re-fetch quotes with a new token');
        const token = await this.updateOldToken();
        const guide = await this.createGuide(payload, token);

        messages.push('Mn: Guide created successfully');
        return {
          guide,
          messages,
        };
      }

      return {
        guide: res?.guide,
        messages,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  /**
   * Generic helper to execute Manuable API operations with automatic token management.
   * Handles token creation, validation, and 401 retry logic.
   */
  private async executeWithManuableToken<T>(
    operation: (token: string) => Promise<T>,
    operationName: string,
  ): Promise<{ result: T; messages: string[] }> {
    const messages: string[] = [];

    try {
      // 1. Get existing token
      const apiKey = await this.generalInfoDbService.getMnTk();

      if (!apiKey) {
        messages.push(`Mn: Creating token for ${operationName}`);
        const newToken = await this.createToken();
        const result = await operation(newToken.mnTk);
        messages.push(`Mn: ${operationName} completed successfully`);
        return { result, messages };
      }

      messages.push('Mn: Token valid');

      try {
        // 2. Try with existing token
        const result = await operation(apiKey.mnTk);
        messages.push(`Mn: ${operationName} completed successfully`);
        return { result, messages };
      } catch (error) {
        // Handle 401 unauthorized - retry with new token
        if (
          error instanceof Error &&
          error.message === 'Request failed with status code 401'
        ) {
          messages.push(
            `Mn: Token expired, creating new token for ${operationName}`,
          );
          const newToken = await this.updateOldToken();
          const result = await operation(newToken);
          messages.push(
            `Mn: ${operationName} completed successfully with new token`,
          );
          return { result, messages };
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        messages.push(`Mn: ${error.message}`);
        throw error;
      }
      messages.push(`Mn: An unknown error occurred during ${operationName}`);
      throw new BadRequestException(
        `An unknown error occurred during ${operationName}`,
      );
    }
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
   * 2-a: If the token does not exist, create it and create guide
   * 2-b: Create guide and return them.
   * The result can return an unauthorized error or the quotes
   */
  async createGuideManuable(
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
      const token = await this.getManuableSession();
      if (!token) {
        throw new BadRequestException(MANUABLE_FAILED_CREATE_TOKEN);
      }
      const newToken = await this.generalInfoDbService.createMnTk(token);
      return newToken;
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
      // 1. Create new token
      const token = await this.getManuableSession();
      if (!token) {
        throw new BadRequestException(MANUABLE_FAILED_CREATE_TOKEN);
      }

      // 2. Get old token
      const oldMnTk = await this.generalInfoDbService.getMnTk();
      if (!oldMnTk) {
        throw new BadRequestException(MANUABLE_FAILED_TOKEN);
      }
      await this.generalInfoDbService.updateMbTk({
        changes: { mnTkId: oldMnTk._id as string, mnTk: token },
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
