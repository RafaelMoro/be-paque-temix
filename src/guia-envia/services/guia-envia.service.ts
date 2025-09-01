import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  QUOTE_ENDPOINT_GE,
  GE_MISSING_API_KEY_ERROR,
  GE_MISSING_URI_ERROR,
  GE_MISSING_CONFIG_ERROR,
} from '../guia-envia.constants';
import { GEQuote } from '../guia-envia.interface';
import {
  calculateTotalQuotesGE,
  formatPayloadGE,
  formatQuotesGE,
} from '../guia-envia.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GetQuoteData } from '@/quotes/quotes.interface';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<GetQuoteData[]> {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }
      if (!config) {
        throw new BadRequestException(GE_MISSING_CONFIG_ERROR);
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
      const updatedQuotes = calculateTotalQuotesGE(formattedQuotes, config);
      return updatedQuotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
