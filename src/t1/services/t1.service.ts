import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  CREATE_GUIDE_T1_ENDPOINT,
  QUOTE_T1_ENDPOINT,
  T1_MISSING_ACCESS_TOKEN,
  T1_MISSING_PROVIDER_PROFIT_MARGIN,
  T1_MISSING_STORE_ID_ERROR,
  T1_MISSING_URI_ERROR,
} from '../t1.constants';
import {
  T1GetQuoteResponse,
  T1GetTokenResponse,
  T1FormattedPayload,
  T1CreateGuideRequest,
  T1ExternalCreateGuideResponse,
  CreateGuideToneDataResponse,
} from '../t1.interface';
import {
  formatPayloadCreateGuideT1,
  formatPayloadT1,
  formatT1QuoteData,
  formatT1CreateGuideResponse,
} from '../t1.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import { PROD_ENV } from '@/app.constant';
import {
  TokenManagerService,
  TokenOperations,
} from '@/token-manager/services/token-manager.service';

@Injectable()
export class T1Service {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private generalInfoDbService: GeneralInfoDbService,
    private tokenManagerService: TokenManagerService,
  ) {}

  /**
   * Private method to validate T1 configuration variables
   */
  private validateT1Config() {
    const tkUri = this.configService.t1.tkUri;
    const clientId = this.configService.t1.tkClientId;
    const clientSecret = this.configService.t1.tkClientSecret;
    const username = this.configService.t1.tkUsername;
    const password = this.configService.t1.tkPassword;

    if (!tkUri) {
      throw new BadRequestException('T1 token URI is missing');
    }
    if (!clientId) {
      throw new BadRequestException('T1 client ID is missing');
    }
    if (!clientSecret) {
      throw new BadRequestException('T1 client secret is missing');
    }
    if (!username) {
      throw new BadRequestException('T1 username is missing');
    }
    if (!password) {
      throw new BadRequestException('T1 password is missing');
    }

    return {
      tkUri,
      clientId,
      clientSecret,
      username,
      password,
    };
  }

  /**
   * Returns token operations for T1 API integration with TokenManagerService
   */
  private getT1TokenOperations(): TokenOperations {
    return {
      createNewToken: async () => {
        this.validateT1Config(); // Validate config before creating token
        const tkUri = this.configService.t1.tkUri!;
        const clientId = this.configService.t1.tkClientId!;
        const clientSecret = this.configService.t1.tkClientSecret!;
        const username = this.configService.t1.tkUsername!;
        const password = this.configService.t1.tkPassword!;

        const payload = {
          grant_type: 'password',
          client_id: clientId,
          client_secret: clientSecret,
          username,
          password,
        };

        const response: AxiosResponse<T1GetTokenResponse, unknown> =
          await axios.post(tkUri, payload, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 45000, // 45 seconds timeout
          });

        const accessToken = response?.data?.access_token;
        if (!accessToken) {
          throw new BadRequestException(T1_MISSING_ACCESS_TOKEN);
        }
        return accessToken;
      },
      updateStoredToken: async (token: string, isProd: boolean) => {
        await this.generalInfoDbService.updateToneToken({ token, isProd });
      },
      getStoredToken: async (isProd: boolean) => {
        return await this.generalInfoDbService.getToneTk({ isProd });
      },
    };
  }

  /**
   * Generic helper to execute T1 API operations with automatic token management.
   * Uses TokenManagerService for consistent token handling across providers.
   */
  private async executeWithT1Token<T>(
    operation: (token: string) => Promise<T>,
    operationName: string,
  ): Promise<{ result: T; messages: string[] }> {
    const env = this.configService.environment;
    const isProd = env === PROD_ENV;

    return this.tokenManagerService.executeWithTokenManagement(
      operation,
      operationName,
      isProd,
      this.getT1TokenOperations(),
      'T1',
    );
  }

  async createNewTk() {
    try {
      const messages: string[] = [];
      const env = this.configService.environment;
      const isProd = env === PROD_ENV;

      // Use token operations to create and store the new token
      const tokenOps = this.getT1TokenOperations();
      const newToken = await tokenOps.createNewToken();
      await tokenOps.updateStoredToken(newToken, isProd);

      messages.push('Token retrieved successfully');
      messages.push('Token stored successfully');

      return {
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
   * This service is to get quotes from T1 API with automatic token management and retry logic.
   * Similar to retrieveManuableQuotes, it handles token creation and retry on authorization failures.
   */
  async retrieveT1Quotes(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    const storeId = this.configService.t1.storeId!;
    const payloadFormatted = formatPayloadT1({ payload, storeId });

    const { result: quotes, messages } = await this.executeWithT1Token(
      (token) => this.fetchT1Quotes(payloadFormatted, token),
      'quote fetching',
    );

    if (!quotes) {
      messages.push('T1: Failed to fetch quotes');
      return {
        messages,
        quotes: [],
      };
    }

    const formattedQuotes = formatT1QuoteData(quotes);
    const { quotes: quotesCalculated, messages: updatedMessages } =
      calculateTotalQuotes({
        quotes: formattedQuotes,
        provider: 'TONE',
        config,
        messages,
        providerNotFoundMessage: T1_MISSING_PROVIDER_PROFIT_MARGIN,
      });

    return {
      quotes: quotesCalculated,
      messages: updatedMessages,
    };
  }

  /**
   * Private method to fetch quotes from T1 API with a given token
   */
  private async fetchT1Quotes(
    payloadFormatted: T1FormattedPayload,
    token: string,
  ): Promise<T1GetQuoteResponse> {
    const uri = this.configService.t1.uri!;
    const storeId = this.configService.t1.storeId!;

    if (!uri) {
      throw new BadRequestException(T1_MISSING_URI_ERROR);
    }
    if (!storeId) {
      throw new BadRequestException(T1_MISSING_STORE_ID_ERROR);
    }

    const url = `${uri}${QUOTE_T1_ENDPOINT}`;
    const response: AxiosResponse<T1GetQuoteResponse, unknown> =
      await axios.post(url, payloadFormatted, {
        headers: {
          Authorization: `Bearer ${token}`,
          shop_id: storeId,
        },
        timeout: 45000, // 45 seconds timeout
      });

    return response?.data;
  }

  async getQuote(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    return this.retrieveT1Quotes(payload, config);
  }

  async createGuide(
    payload: T1CreateGuideRequest,
  ): Promise<CreateGuideToneDataResponse> {
    const storeId = this.configService.t1.storeId!;

    const payloadFormatted = formatPayloadCreateGuideT1({
      payload,
      storeId,
      notifyMe: payload.notifyMe,
      quoteToken: payload.quoteToken,
    });

    const { result: guideResponse, messages } = await this.executeWithT1Token(
      (token) => this.createT1Guide(payloadFormatted, token),
      'guide creation',
    );

    if (!guideResponse) {
      throw new BadRequestException('T1: Failed to create guide');
    }

    const standardGuide = formatT1CreateGuideResponse(guideResponse);
    const npmVersion: string = this.configService.version!;

    return {
      version: npmVersion,
      message: null,
      messages,
      error: null,
      data: {
        guide: standardGuide,
      },
    };
  }

  /**
   * Private method to create guide in T1 API with a given token
   */
  private async createT1Guide(
    payloadFormatted: any,
    token: string,
  ): Promise<T1ExternalCreateGuideResponse> {
    const uri = this.configService.t1.uri!;
    const storeId = this.configService.t1.storeId!;

    if (!uri) {
      throw new BadRequestException(T1_MISSING_URI_ERROR);
    }
    if (!storeId) {
      throw new BadRequestException(T1_MISSING_STORE_ID_ERROR);
    }

    const url = `${uri}${CREATE_GUIDE_T1_ENDPOINT}`;
    const response: AxiosResponse<T1ExternalCreateGuideResponse, unknown> =
      await axios.post(url, payloadFormatted, {
        headers: {
          Authorization: `Bearer ${token}`,
          shop_id: storeId,
        },
        timeout: 45000, // 45 seconds timeout
      });

    return response?.data;
  }
}
