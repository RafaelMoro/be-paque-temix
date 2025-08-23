import config from '@/config';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import {
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_URI_ERROR,
  QUOTE_PAKKE_ENDPOINT,
} from '../pakke.constants';
import { PakkeGetQuoteResponse } from '../pakke.interface';
import { convertPayloadToPakkeDto, formatPakkeQuotes } from '../pakke.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GetQuoteData } from '@/quotes/quotes.interface';

@Injectable()
export class PakkeService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuotePakke(payload: GetQuoteDto): Promise<GetQuoteData[]> {
    try {
      const apiKey = this.configService.pakke.apiKey!;
      const uri = this.configService.pakke.uri!;

      if (!apiKey) {
        throw new BadRequestException(PAKKE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(PAKKE_MISSING_URI_ERROR);
      }

      const payloadTransformed = convertPayloadToPakkeDto(payload);
      const url = `${uri}${QUOTE_PAKKE_ENDPOINT}`;
      const response: AxiosResponse<PakkeGetQuoteResponse, unknown> =
        await axios.post(url, payloadTransformed, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const quotes = formatPakkeQuotes(data);
      return quotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
