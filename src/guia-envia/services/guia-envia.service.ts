import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios from 'axios';

import config from '@/config';
import { COTIZATION_ENDPOINT } from '../guia-envia.constants';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote() {
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
      const response = await axios.get(`${uri}${COTIZATION_ENDPOINT}`);
      console.log('res', response);
      return 'ok';
      // something
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
