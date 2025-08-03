import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  MANUABLE_ERROR_MISSING_EMAIL,
  MANUABLE_ERROR_MISSING_PWD,
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_ERROR_UNAUTHORIZED,
  MANUABLE_FAILED_CREATE_TOKEN,
  MANUABLE_FAILED_FETCH_QUOTES,
  MANUABLE_FAILED_TOKEN,
  MANUABLE_TOKEN_ENDPOINT,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';
import {
  FetchManuableQuotesResponse,
  GetManuableQuoteResponse,
  GetManuableSessionResponse,
  ManuablePayload,
} from '../manuable.interface';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';
import { formatManuableQuote, formatPayload } from '../manuable.utils';
import { GetQuoteGEDto } from '@/guia-envia/dtos/guia-envia.dtos';

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
  formatManuablePayload(payload: GetQuoteGEDto) {
    return formatPayload(payload);
  }

  /**
   * This service is to get quotes from Manuable API.
   * a: If the service gets and unauthorized error,
   * then attempt to replace the token and refetch the quotes
   * b: Fetch quotes
   */
  async retrieveManuableQuotes(
    payload: GetQuoteGEDto,
  ): Promise<GetManuableQuoteResponse> {
    try {
      const res = await this.getManuableQuote(payload);
      const messages: string[] = [...res.messages];
      if (res?.messages.includes(MANUABLE_ERROR_UNAUTHORIZED)) {
        messages.push(
          'Unauthorized error, attempting to re-fetch quotes with a new token',
        );
        const quotes = await this.reAttemptGetManuableQuote(payload);
        const formattedQuotes = formatManuableQuote(quotes);
        return {
          messages,
          quotes: formattedQuotes,
        };
      }

      return res;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
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
    payload: GetQuoteGEDto,
  ): Promise<GetManuableQuoteResponse> {
    try {
      const messages: string[] = [];
      // Get token of Manuable first with general info db service
      const formattedPayload = this.formatManuablePayload(payload);

      // 1. Get token
      const apiKey = await this.generalInfoDbService.getMnTk();

      if (!apiKey) {
        messages.push('Creating token');
        const newToken = await this.createToken();

        // 4. Fetch quotes
        const quotes = await this.fetchManuableQuotes(
          formattedPayload,
          newToken.mnTk,
        );
        if (!quotes) {
          messages.push(MANUABLE_FAILED_FETCH_QUOTES);
          return {
            messages,
            quotes: [],
          };
        }
        messages.push('Mn Quotes fetched successfully');
        const formattedQuotes = formatManuableQuote(quotes);
        return {
          messages,
          quotes: formattedQuotes,
        };
      }
      messages.push('Token exists');

      // 2. Fetch quotes with existing token
      const quotes = await this.fetchManuableQuotes(
        formattedPayload,
        apiKey.mnTk,
      );
      messages.push('Mn Quotes fetched successfully');
      const formattedQuotes = formatManuableQuote(quotes);
      if (!quotes) {
        messages.push(MANUABLE_FAILED_FETCH_QUOTES);
        return {
          messages,
          quotes: [],
        };
      }
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

        messages.push(error.message);
        return {
          messages,
          quotes: [],
        };
      }

      messages.push('An unknown error occurred');
      return {
        messages,
        quotes: [],
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
   * This service is meant when the token of Mn has expired and we need to get a new one,
   * Update the token saved and fetch the quotes
   */
  async reAttemptGetManuableQuote(payload: GetQuoteGEDto) {
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
      const manuablePayload = this.formatManuablePayload(payload);
      const quotes = await this.fetchManuableQuotes(manuablePayload, token);
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
}
