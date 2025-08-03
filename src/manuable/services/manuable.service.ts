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

  formatManuablePayload(payload: GetQuoteGEDto) {
    return formatPayload(payload);
  }

  async getManuableQuote(
    payload: GetQuoteGEDto,
  ): Promise<GetManuableQuoteResponse> {
    try {
      // Get token of Manuable first with general info db service
      const formattedPayload = this.formatManuablePayload(payload);

      // 1. Get token
      const apiKey = await this.generalInfoDbService.getMnTk();

      if (!apiKey) {
        // 2. Create token if it does not exist
        const token = await this.getManuableSession();
        if (!token) {
          return {
            message: MANUABLE_FAILED_CREATE_TOKEN,
            quotes: [],
          };
        }
        // 3. Save token
        const newToken = await this.generalInfoDbService.createMnTk(token);

        // 4. Fetch quotes
        const quotes = await this.fetchManuableQuotes(
          formattedPayload,
          newToken.mnTk,
        );
        const formattedQuotes = formatManuableQuote(quotes);
        if (!quotes) {
          return {
            message: MANUABLE_FAILED_FETCH_QUOTES,
            quotes: [],
          };
        }
        return {
          message: 'ok',
          quotes: formattedQuotes,
        };
      }

      // 2. Fetch quotes with existing token
      const quotes = await this.fetchManuableQuotes(
        formattedPayload,
        apiKey.mnTk,
      );
      const formattedQuotes = formatManuableQuote(quotes);
      if (!quotes) {
        return {
          message: MANUABLE_FAILED_FETCH_QUOTES,
          quotes: [],
        };
      }
      return {
        message: 'ok',
        quotes: formattedQuotes,
      };
    } catch (error) {
      if (error instanceof Error) {
        // The service fetchManuableQuotes returned 401 Unauthorized
        if (error?.message === 'Request failed with status code 401') {
          return {
            message: MANUABLE_ERROR_UNAUTHORIZED,
            quotes: [],
          };
        }
        return {
          message: error.message,
          quotes: [],
        };
      }
      return {
        message: 'An unknown error occurred',
        quotes: [],
      };
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
