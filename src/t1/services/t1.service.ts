import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import { COTIZATION_ENDPOINT } from '../t1.constants';
import { T1GetQuoteResponse } from '../t1.interface';
import { formatPayload, formatT1QuoteData } from '../t1.utils';
import { GetQuoteGEDto } from '@/guia-envia/dtos/guia-envia.dtos';

@Injectable()
export class T1Service {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  // TODO: Receive standard get quote DTO
  async getQuote(payload: GetQuoteGEDto) {
    try {
      const apiKey = this.configService.t1.apiKey!;
      const uri = this.configService.t1.uri!;
      const storeId = this.configService.t1.storeId!;

      const payloadFormatted = formatPayload({ payload, storeId });

      if (!apiKey) {
        throw new BadRequestException(
          'API key for Guia Envia is not configured',
        );
      }
      if (!uri) {
        throw new BadRequestException('URI for Guia Envia is not configured');
      }
      if (!storeId) {
        throw new BadRequestException('Store ID for T1 is not configured');
      }

      const url = `${uri}${COTIZATION_ENDPOINT}`;
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
