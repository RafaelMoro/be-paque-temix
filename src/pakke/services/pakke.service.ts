/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import config from '@/config';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import {
  CREATE_GUIDE_PAKKE_ENDPOINT,
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_PROVIDER_PROFIT_MARGIN,
  PAKKE_MISSING_URI_ERROR,
  QUOTE_PAKKE_ENDPOINT,
} from '../pakke.constants';
import {
  CreateGuidePkkDataResponse,
  PakkeExternalCreateGuideResponse,
  PakkeGetQuoteResponse,
  PkkCreateGuideRequest,
} from '../pakke.interface';
import {
  convertPayloadToPakkeDto,
  convertPkkCreateGuideToExternal,
  formatPakkeCreateGuideResponse,
  formatPakkeQuotes,
} from '../pakke.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';

@Injectable()
export class PakkeService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuotePakke(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    try {
      const messages: string[] = [];
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
      const formattedQuotes = formatPakkeQuotes(data);
      const { quotes, messages: updatedMessages } = calculateTotalQuotes({
        quotes: formattedQuotes,
        provider: 'Pkk',
        config,
        messages,
        providerNotFoundMessage: PAKKE_MISSING_PROVIDER_PROFIT_MARGIN,
      });

      return {
        quotes,
        messages: updatedMessages,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createGuidePakke(
    payload: PkkCreateGuideRequest,
  ): Promise<CreateGuidePkkDataResponse> {
    try {
      const messages: string[] = [];
      const apiKey = this.configService.pakke.apiKey!;
      const uri = this.configService.pakke.uri!;

      if (!apiKey) {
        throw new BadRequestException(PAKKE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(PAKKE_MISSING_URI_ERROR);
      }

      const payloadTransformed = convertPkkCreateGuideToExternal(payload);
      const url = `${uri}${CREATE_GUIDE_PAKKE_ENDPOINT}`;
      const response: AxiosResponse<PakkeExternalCreateGuideResponse, unknown> =
        await axios.post(url, payloadTransformed, {
          headers: {
            Authorization: apiKey,
          },
        });
      messages.push('Pkk Guide created successfully');
      const data = response?.data;
      console.log('data', data);

      const formattedData = formatPakkeCreateGuideResponse(data);
      console.log('formattedData', formattedData);
      const npmVersion: string = this.configService.version!;
      return {
        version: npmVersion,
        message: null,
        messages,
        error: null,
        data: {
          guide: formattedData,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error?.message;
        const errorDetails = error?.response?.data?.error?.details;
        const allErrorDetails = errorDetails.join('|  ');

        if (errorMessage || errorDetails) {
          throw new BadRequestException(`${errorMessage}: ${allErrorDetails}`);
        }
        throw new BadRequestException(error.message);
      }
      console.log('error', error);
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
