import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  QUOTE_ENDPOINT_GE,
  GE_MISSING_API_KEY_ERROR,
  GE_MISSING_URI_ERROR,
} from '../guia-envia.constants';
import { GEQuote } from '../guia-envia.interface';
import { formatPayloadGE, formatQuotesGE } from '../guia-envia.utils';
import { GetQuoteDto } from '@/app.dto';
import { GetQuoteData } from '@/global.interface';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(payload: GetQuoteDto): Promise<GetQuoteData[]> {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }

      const transformedPayload = formatPayloadGE(payload);
      const url = `${uri}${QUOTE_ENDPOINT_GE}`;
      const response: AxiosResponse<GEQuote[], unknown> = await axios.post(
        url,
        transformedPayload,
        {
          headers: {
            Authorization: apiKey,
          },
        },
      );
      // transform data and add a prop to identify that this service is coming from guia envia
      const data = response?.data;
      const formattedQuotes = formatQuotesGE(data);
      return formattedQuotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
