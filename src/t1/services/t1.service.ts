import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  QUOTE_T1_ENDPOINT,
  T1_MISSING_API_KEY_ERROR,
  T1_MISSING_STORE_ID_ERROR,
  T1_MISSING_URI_ERROR,
} from '../t1.constants';
import { T1GetQuoteResponse } from '../t1.interface';
import { formatPayloadT1, formatT1QuoteData } from '../t1.utils';
import { GetQuoteDto } from '@/app.dto';

@Injectable()
export class T1Service {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(payload: GetQuoteDto) {
    try {
      const apiKey = this.configService.t1.apiKey!;
      const uri = this.configService.t1.uri!;
      const storeId = this.configService.t1.storeId!;

      const payloadFormatted = formatPayloadT1({ payload, storeId });

      if (!apiKey) {
        throw new BadRequestException(T1_MISSING_API_KEY_ERROR);
      }
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
      return formattedQuotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
