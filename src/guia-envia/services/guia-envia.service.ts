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
  CREATE_ADDRESS_ENDPOINT_GE,
  GET_SERVICES_ENDPOINT_GE,
  CREATE_GUIDE_ENDPOINT_GE,
} from '../guia-envia.constants';
import {
  NeighborhoodGE,
  GEQuote,
  GetNeighborhoodInfoPayload,
  GetAddressInfoResponse,
  CreateAddressPayload,
  ExtAddressGEResponse,
  CreateAddressResponseGE,
  GetServiceGEResponse,
  CreateGuideGeRequest,
  ExtCreateGuideGEResponse,
  CreateGuideGEDataResponse,
  ExtGetAllAddressesGEResponse,
  GetAliasesGEDataResponse,
  DeleteAddressGEDataResponse,
  EditAddressGEDataResponse,
} from '../guia-envia.interface';
import { CreateGEAddressDto } from '@/quotes/dtos/quotes.dto';
import {
  formatAddressesGE,
  formatCreateAddressPayloadGE,
  formatCreateAddressResponseGE,
  formatCreateGuidePayloadGE,
  formatCreateGuideResponseGE,
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
      if (axios.isAxiosError(error)) {
        console.log(
          'Error in fetchGEQuotes:',
          error?.response?.data || error.message,
        );
        throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        console.log('error getting quote ge inst error', error);
        throw new BadRequestException(error.message);
      }
      console.log('error getting quote ge unknown error', error);
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

  async createAddress(
    payload: CreateGEAddressDto,
  ): Promise<CreateAddressResponseGE> {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      // const npmVersion: string = this.configService.version!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }

      const transformedPayload = formatCreateAddressPayloadGE(
        payload as CreateAddressPayload,
      );
      const url = `${uri}${CREATE_ADDRESS_ENDPOINT_GE}`;
      const response: AxiosResponse<ExtAddressGEResponse, unknown> =
        await axios.post(url, transformedPayload, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const formattedData = formatCreateAddressResponseGE(data);
      return formattedData;
    } catch (error) {
      console.log('error creating address ge', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async editGEAddress({
    id,
    payload,
  }: {
    id: string;
    payload: CreateGEAddressDto;
  }): Promise<EditAddressGEDataResponse> {
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
      const transformedPayload = formatCreateAddressPayloadGE(
        payload as CreateAddressPayload,
      );
      const editUri = `${uri}${CREATE_ADDRESS_ENDPOINT_GE}/${id}`;
      await axios.put(editUri, transformedPayload, {
        headers: {
          Authorization: apiKey,
        },
      });

      return {
        version: npmVersion,
        message: 'Address edited successfully',
        error: null,
        data: null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const newError = error?.response?.data || error.message;
        console.log('axios error editing address ge', newError);
        throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        console.log('error editing address ge inst error', error);
        throw new BadRequestException(error.message);
      }
      console.log('error editing address ge unknown error', error);
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async deleteGEAddress(id: string): Promise<DeleteAddressGEDataResponse> {
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

      const deleteUrl = `${uri}${CREATE_ADDRESS_ENDPOINT_GE}?id=${id}`;
      await axios.delete(deleteUrl, {
        headers: {
          Authorization: apiKey,
        },
      });

      return {
        version: npmVersion,
        message: 'Address deleted successfully',
        error: null,
        data: null,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const newError = error?.response?.data || error.message;
        console.log('axios error deleting address ge', newError);
        throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        console.log('error deleting address ge inst error', error);
        throw new BadRequestException(error.message);
      }
      console.log('error deleting address ge unknown error', error);
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getAddressesSavedGe({
    page,
    aliasesOnly,
  }: {
    page?: string;
    aliasesOnly?: boolean;
  }): Promise<GetAliasesGEDataResponse> {
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

      const url = `${uri}${CREATE_ADDRESS_ENDPOINT_GE}?limit=100${page ? `&page=${page}` : ''}`;
      const response: AxiosResponse<ExtGetAllAddressesGEResponse, unknown> =
        await axios.get(url, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      if (aliasesOnly) {
        const aliases = (data?.data ?? []).map((address) => address.alias);
        return {
          version: npmVersion,
          message: null,
          error: null,
          data: {
            aliases,
            addresses: [],
            page: data?.meta?.page ?? 1,
            pages: data?.meta?.pages ?? 1,
          },
        };
      }

      const addressesTransformed = formatAddressesGE(data?.data ?? []);
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          aliases: [],
          addresses: addressesTransformed,
          page: data?.meta?.page ?? 1,
          pages: data?.meta?.pages ?? 1,
        },
      };
    } catch (error) {
      console.log('error get addresses ge', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(error?.response?.data);
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async listServicesGe() {
    try {
      const apiKey = this.configService.guiaEnvia.apiKey!;
      const uri = this.configService.guiaEnvia.uri!;
      if (!apiKey) {
        throw new BadRequestException(GE_MISSING_API_KEY_ERROR);
      }
      if (!uri) {
        throw new BadRequestException(GE_MISSING_URI_ERROR);
      }

      const url = `${uri}${GET_SERVICES_ENDPOINT_GE}`;
      const response: AxiosResponse<GetServiceGEResponse[], unknown> =
        await axios.get(url, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      return data;
    } catch (error) {
      console.log('error list services ge', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(error?.response?.data);
        // throw new BadRequestException(error?.response?.data || error.message);
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createGuideGe(
    payload: CreateGuideGeRequest,
  ): Promise<CreateGuideGEDataResponse> {
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

      const formattedPayload = formatCreateGuidePayloadGE(payload);
      const url = `${uri}${CREATE_GUIDE_ENDPOINT_GE}`;
      const response: AxiosResponse<ExtCreateGuideGEResponse, unknown> =
        await axios.post(url, formattedPayload, {
          headers: {
            Authorization: apiKey,
          },
        });
      const data = response?.data;
      const dataFormatted = formatCreateGuideResponseGE(data);
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          guide: dataFormatted,
        },
      };
    } catch (error) {
      console.log('error create guide ge', error);
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(error?.response?.data);
      }
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
