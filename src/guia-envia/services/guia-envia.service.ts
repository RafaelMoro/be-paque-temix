import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios from 'axios';

import config from '@/config';
import { COTIZATION_ENDPOINT } from '../guia-envia.constants';
import { GetQuoteDto } from '../dtos/guia-envia.dtos';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(payload: GetQuoteDto) {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      if (!apiKey) {
        throw new BadRequestException(
          'API key for Guia Envia is not configured',
        );
      }
      if (!uri) {
        throw new BadRequestException('URI for Guia Envia is not configured');
      }
      const url = `${uri}${COTIZATION_ENDPOINT}`;
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: apiKey,
        },
      });
      // transform data and add a prop to identify that this service is coming from guia envia
      console.log('res', response?.data);
      return 'ok';
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
