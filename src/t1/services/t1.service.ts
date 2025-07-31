import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios from 'axios';

import config from '@/config';
import { COTIZATION_ENDPOINT } from '../t1.constants';

@Injectable()
export class T1Service {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote() {
    try {
      const apiKey = this.configService.t1.apiKey!;
      const uri = this.configService.t1.uri!;
      const storeId = this.configService.t1.storeId!;

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
      const payload = {
        codigo_postal_origen: '72000',
        codigo_postal_destino: '58130',
        peso: 5,
        largo: 30,
        ancho: 20,
        alto: 20,
        dias_embarque: 0,
        seguro: false,
        valor_paquete: 0,
        tipo_paquete: 0,
        comercio_id: storeId,
      };
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      console.log('responde', response?.data);
      return 'quote';
      // something
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
