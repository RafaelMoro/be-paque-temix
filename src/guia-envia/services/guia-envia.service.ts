import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  COTIZATION_ENDPOINT,
  GE_MISSING_API_KEY_ERROR,
  GE_MISSING_URI_ERROR,
} from '../guia-envia.constants';
import { GetQuoteGEDto } from '../dtos/guia-envia.dtos';
import { GEQuote } from '../guia-envia.interface';
import { formatQuotes } from '../guia-envia.utils';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(payload: GetQuoteGEDto) {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }
      const url = `${uri}${COTIZATION_ENDPOINT}`;
      const response: AxiosResponse<GEQuote[], unknown> = await axios.post(
        url,
        payload,
        {
          headers: {
            Authorization: apiKey,
          },
        },
      );
      // transform data and add a prop to identify that this service is coming from guia envia
      const data = response?.data;
      const formattedQuotes = formatQuotes(data);
      return formattedQuotes;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
