import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  QUOTE_T1_ENDPOINT,
  T1_MISSING_ACCESS_TOKEN,
  T1_MISSING_API_KEY_ERROR,
  T1_MISSING_PROVIDER_PROFIT_MARGIN,
  T1_MISSING_STORE_ID_ERROR,
  T1_MISSING_URI_ERROR,
} from '../t1.constants';
import { T1GetQuoteResponse, T1GetTokenResponse } from '../t1.interface';
import { formatPayloadT1, formatT1QuoteData } from '../t1.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import { PROD_ENV } from '@/app.constant';

@Injectable()
export class T1Service {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private generalInfoDbService: GeneralInfoDbService,
  ) {}

  async createNewTk() {
    try {
      const messages: string[] = [];

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
        });
      const accessToken = response?.data?.access_token;
      console.log('data', response?.data);

      // Store the token in the database
      if (!accessToken) {
        throw new BadRequestException(T1_MISSING_ACCESS_TOKEN);
      }
      messages.push('Token retrieved successfully');
      const env = this.configService.environment;
      const isProd = env === PROD_ENV;

      await this.generalInfoDbService.updateToneToken({
        token: accessToken,
        isProd,
      });
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
   * Private method to fetch quotes from T1 API with the given token
   */
  private async fetchQuotesWithToken({
    payloadFormatted,
    apiKey,
    config,
    messages,
  }: {
    payloadFormatted: any;
    apiKey: string;
    config: GlobalConfigsDoc;
    messages: string[];
  }): Promise<ExtApiGetQuoteResponse> {
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
          Authorization: `Bearer ${apiKey}`,
          shop_id: storeId,
        },
      });
    const data = response?.data;
    const formattedQuotes = formatT1QuoteData(data);
    const { quotes, messages: updatedMessages } = calculateTotalQuotes({
      quotes: formattedQuotes,
      provider: 'TONE',
      config,
      messages,
      providerNotFoundMessage: T1_MISSING_PROVIDER_PROFIT_MARGIN,
    });
    return {
      quotes,
      messages: updatedMessages,
    };
  }

  async getQuote(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    try {
      const messages: string[] = [];

      // Get API key from database instead of config
      const env = this.configService.environment;
      const isProd = env === PROD_ENV;
      const apiKey = await this.generalInfoDbService.getToneTk({ isProd });

      const storeId = this.configService.t1.storeId!;

      const payloadFormatted = formatPayloadT1({ payload, storeId });

      if (!apiKey) {
        // If no API key exists, create a new token first
        messages.push('T1: No API key found, creating new token');
        await this.createNewTk();

        // Get the newly created API key
        const newApiKey = await this.generalInfoDbService.getToneTk({ isProd });
        if (!newApiKey) {
          throw new BadRequestException(T1_MISSING_API_KEY_ERROR);
        }

        messages.push('T1: New token created and retrieved successfully');

        // Use the new API key to fetch quotes
        return await this.fetchQuotesWithToken({
          payloadFormatted,
          apiKey: newApiKey,
          config,
          messages,
        });
      }

      // If API key exists, use it directly to fetch quotes
      return await this.fetchQuotesWithToken({
        payloadFormatted,
        apiKey,
        config,
        messages,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
