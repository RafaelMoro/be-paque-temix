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
  MANUABLE_TOKEN_ENDPOINT,
  QUOTE_MANUABLE_ENDPOINT,
} from '../manuable.constants';
import { GetManuableSessionResponse } from '../manuable.interface';
import { GeneralInfoDbService } from '@/general-info-db/services/general-info-db.service';

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

  async getManuableQuote() {
    try {
      // Get token of Manuable first with general info db service
      const payload = {
        address_from: {
          country_code: 'MX',
          zip_code: '72000',
        },
        address_to: {
          country_code: 'MX',
          zip_code: '94298',
        },
        parcel: {
          currency: 'MXN',
          distance_unit: 'CM',
          mass_unit: 'KG',
          height: 30,
          length: 20,
          width: 20,
          weight: 5,
          product_id: '1',
          product_value: 1,
          quantity_products: 1,
          content: 'Kraft',
        },
      };
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
        const quotes = await this.fetchManuableQuotes(payload, newToken.mnTk);
        if (!quotes) {
          return {
            message: MANUABLE_FAILED_FETCH_QUOTES,
            quotes: [],
          };
        }
        return {
          message: 'ok',
          quotes,
        };
      }

      // 2. Fetch quotes with existing token
      const quotes = await this.fetchManuableQuotes(payload, apiKey.mnTk);
      if (!quotes) {
        return {
          message: MANUABLE_FAILED_FETCH_QUOTES,
          quotes: [],
        };
      }
      return {
        message: 'ok',
        quotes,
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

  // TODO: Change payload type
  async fetchManuableQuotes(payload: any, token: string) {
    try {
      const { uri } = this.configService.manuable;
      if (!uri) {
        throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);
      }

      const url = `${uri}${QUOTE_MANUABLE_ENDPOINT}`;
      const response: AxiosResponse<any, unknown> = await axios.post(
        url,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = response?.data;
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
