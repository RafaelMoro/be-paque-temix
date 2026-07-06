import config from '@/config';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

import {
  CREATE_GUIDE_PAKKE_ENDPOINT,
  GET_BASIC_GUIDES_PAKKE_ENDPOINT,
  GET_SINGLE_GUIDE_PAKKE_ENDPOINT,
  PAKKE_MISSING_API_KEY_ERROR,
  PAKKE_MISSING_PROVIDER_PROFIT_MARGIN,
  PAKKE_MISSING_URI_ERROR,
  QUOTE_PAKKE_ENDPOINT,
} from '../pakke.constants';
import {
  CreateGuidePkkDataResponse,
  GetGuidePkkPayload,
  PakkeExternalCreateGuideResponse,
  PakkeExternalGetBasicGuideInfo,
  PakkeExternalGetGuide,
  PakkeGetQuoteResponse,
  PkkCreateGuideRequest,
} from '../pakke.interface';
import {
  convertPayloadToPakkeDto,
  convertPkkCreateGuideToExternal,
  formatPakkeCreateGuideResponse,
  formatPakkeGetBasicInfoGuidesResponse,
  formatPakkeGetGuideDetailResponse,
  formatPakkeQuotes,
} from '../pakke.utils';
import { GetQuoteDto } from '@/quotes/dtos/quotes.dto';
import { ExtApiGetQuoteResponse } from '@/quotes/quotes.interface';
import { calculateTotalQuotes } from '@/quotes/quotes.utils';
import { GlobalConfigsDoc } from '@/global-configs/entities/global-configs.entity';
import {
  GetGuideDataResponse,
  ProviderGuidePayload,
} from '@/guides/guides.interface';

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

  async getBasicGuidesInfoPkk({
    pageNumber = 1,
    pageSize = 30,
  }: GetGuidePkkPayload) {
    try {
      const apiKey = this.configService.pakke.apiKey!;
      const uri = this.configService.pakke.uri!;

      if (!apiKey) {
        throw new BadRequestException(PAKKE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(PAKKE_MISSING_URI_ERROR);
      }

      const startRecordIndex = 0;
      const endRecordIndex = pageSize - 1;
      const url = `${uri}${GET_BASIC_GUIDES_PAKKE_ENDPOINT}/byFilter?pageNumber=${pageNumber}&pageSize=${pageSize}&startRecordIndex=${startRecordIndex}&endRecordIndex=${endRecordIndex}&shipReturn=false&trackingStatus=&feeType=`;
      const response: AxiosResponse<PakkeExternalGetBasicGuideInfo[], unknown> =
        await axios.get(url, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const formattedData = data.map((guide) =>
        formatPakkeGetBasicInfoGuidesResponse(guide),
      );

      return formattedData;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getSingleGuidePkk(shipmentId: string): Promise<GetGuideDataResponse> {
    try {
      const npmVersion: string = this.configService.version!;
      const apiKey = this.configService.pakke.apiKey!;
      const uri = this.configService.pakke.uri!;

      if (!apiKey) {
        throw new BadRequestException(PAKKE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(PAKKE_MISSING_URI_ERROR);
      }

      const url = `${uri}${GET_SINGLE_GUIDE_PAKKE_ENDPOINT}/${shipmentId}`;
      const response: AxiosResponse<PakkeExternalGetGuide, unknown> =
        await axios.get(url, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const formattedData = formatPakkeGetGuideDetailResponse(data);
      return {
        version: npmVersion,
        message: null,
        messages: [],
        error: null,
        data: {
          guide: formattedData,
        },
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
      const formattedData = formatPakkeCreateGuideResponse(data);
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
        console.log(
          'Error in createGuidePakke:',
          error?.response?.data || error.message,
        );
        throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        console.log('error inst pkk', error);
        throw new BadRequestException(error.message);
      }
      console.log('error unknown pkk', error);
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createGuideStandardized(
    payload: ProviderGuidePayload,
  ): Promise<CreateGuidePkkDataResponse> {
    const pkkPayload: PkkCreateGuideRequest = {
      parcel: {
        content: payload.parcel.content,
        length: payload.parcel.length,
        width: payload.parcel.width,
        height: payload.parcel.height,
        weight: payload.parcel.weight,
      },
      origin: {
        name: payload.origin.name,
        email: payload.origin.email,
        phone: payload.origin.phone,
        company: payload.origin.company,
        street1: payload.origin.street1,
        isResidential: payload.origin.isResidential ?? false,
        street2: payload.origin.street2,
        neighborhood: payload.origin.neighborhood,
        city: payload.origin.city,
        state: payload.origin.state,
        zipcode: payload.origin.zipcode,
      },
      destination: {
        name: payload.destination.name,
        email: payload.destination.email,
        phone: payload.destination.phone,
        company: payload.destination.company,
        street1: payload.destination.street1,
        isResidential: payload.destination.isResidential ?? false,
        street2: payload.destination.street2,
        neighborhood: payload.destination.neighborhood,
        city: payload.destination.city,
        state: payload.destination.state,
        zipcode: payload.destination.zipcode,
      },
    };

    return this.createGuidePakke(pkkPayload);
  }
}
