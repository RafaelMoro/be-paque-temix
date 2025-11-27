import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigType } from '@nestjs/config';

import config from '@/config';
import { AddressDoc } from '../entities/addresses.entity';
import {
  CreateAddressDto,
  CreateAddressDtoPayload,
} from '../dtos/addresses.dto';
import { Address, CreateAddressResponse } from '../addresses.interface';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(AddressDoc.name)
    private addressModel: Model<AddressDoc>,
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {}

  async createAddress({
    payload,
    email,
  }: {
    payload: CreateAddressDtoPayload;
    email: string;
  }): Promise<CreateAddressResponse> {
    try {
      const npmVersion: string = this.configService.version!;
      const updatedPayload: CreateAddressDto = { ...payload, email };
      const newAddress = new this.addressModel(updatedPayload);
      const model: Address = await newAddress.save();
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          address: model,
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
