import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import config from '@/config';
import {
  QUOTE_ENDPOINT_GE,
  GE_MISSING_API_KEY_ERROR,
  GE_MISSING_URI_ERROR,
  GE_MISSING_CONFIG_ERROR,
  GE_MISSING_PROVIDER_PROFIT_MARGIN,
  GET_NEIGHBORHOOD_ENDPOINT_GE,
} from '../guia-envia.constants';
import {
  NeighborhoodGE,
  GEQuote,
  GetNeighborhoodInfoPayload,
  GetAddressInfoResponse,
} from '../guia-envia.interface';
import {
  formatNeighborhoodGE,
  formatPayloadGE,
  formatQuotesGE,
} from '../guia-envia.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';

@Injectable()
export class GuiaEnviaService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async getQuote(
    payload: GetQuoteDto,
    config: GlobalConfigsDoc,
  ): Promise<ExtApiGetQuoteResponse> {
    try {
      const messages: string[] = [];
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
      const { quotes, messages: updatedMessages } = calculateTotalQuotes({
        quotes: formattedQuotes,
        provider: 'GE',
        config,
        messages,
        providerNotFoundMessage: GE_MISSING_PROVIDER_PROFIT_MARGIN,
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

  async getAddressInfo(
    payload: GetNeighborhoodInfoPayload,
  ): Promise<GetAddressInfoResponse> {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      const npmVersion: string = this.configService.version!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }

      const url = `${uri}${GET_NEIGHBORHOOD_ENDPOINT_GE}${payload.zipcode}`;
      const response: AxiosResponse<NeighborhoodGE[], unknown> =
        await axios.get(url, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const transformedData = formatNeighborhoodGE(data);
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          neighborhoods: transformedData,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
