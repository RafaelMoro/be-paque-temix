import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  MANUABLE_ERROR_MISSING_EMAIL,
  MANUABLE_ERROR_MISSING_PWD,
  MANUABLE_ERROR_MISSING_URI,
  MANUABLE_TOKEN_ENDPOINT,
} from '../manuable.constants';
import { GetManuableSessionResponse } from '../manuable.interface';

@Injectable()
export class ManuableService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getManuableSession() {
    try {
      // something
      const { email, pwd, uri } = this.configService.manuable;
      if (!email) throw new BadRequestException(MANUABLE_ERROR_MISSING_EMAIL);
      if (!pwd) throw new BadRequestException(MANUABLE_ERROR_MISSING_PWD);
      if (!uri) throw new BadRequestException(MANUABLE_ERROR_MISSING_URI);

      const payload = {
        email,
        password: pwd,
      };

      const url = `${uri}${MANUABLE_TOKEN_ENDPOINT}`;
      const response: AxiosResponse<GetManuableSessionResponse, unknown> =
        await axios.post(url, payload);
      const token = response?.data?.token;
      return token;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getManuableQuote() {
    try {
      // something
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
