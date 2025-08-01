import config from '@/config';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import {
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_URI_ERROR,
  QUOTE_PAKKE_ENDPOINT,
} from '../pakke.constants';

@Injectable()
export class PakkeService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuotePakke() {
    try {
      const apiKey = this.configService.pakke.apiKey!;
      const uri = this.configService.pakke.uri!;

      if (!apiKey) {
        throw new BadRequestException(PAKKE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(PAKKE_MISSING_URI_ERROR);
      }

      const url = `${uri}${QUOTE_PAKKE_ENDPOINT}`;
      const payload = {
        ZipCodeFrom: '72000',
        ZipCodeTo: '94298',
        Parcel: {
          Weight: '5',
          Width: '20',
          Height: '30',
          Length: '20',
        },
      };
      const response: AxiosResponse<any, unknown> = await axios.post(
        url,
        payload,
        {
          headers: {
            Authorization: apiKey,
          },
        },
      );
      const data = response?.data;
      console.log('data', data);
      return '';
      // something
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
