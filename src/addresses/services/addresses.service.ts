import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model } from 'mongoose';
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

  async verifyAliasExists({
    alias,
    email,
  }: {
    alias: string;
    email: string;
  }): Promise<boolean> {
    try {
      const address = await this.addressModel.findOne({ alias, email }).exec();
      return address !== null;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException(
        'An unknown error occurred verifying alias',
      );
    }
  }

  async createAddress({
    payload,
    email,
  }: {
    payload: CreateAddressDtoPayload;
    email: string;
  }): Promise<CreateAddressResponse> {
    try {
      if (!email) {
        throw new BadRequestException('Email missing from token');
      }

      const aliasExists = await this.verifyAliasExists({
        alias: payload.alias,
        email,
      });
      if (aliasExists) {
        throw new BadRequestException('This alias already exists.');
      }

      const npmVersion: string = this.configService.version!;
      const updatedPayload: CreateAddressDto = { ...payload, email };
      const newAddress = new this.addressModel(updatedPayload);
      const model: Address = await newAddress.save();
      const addressSaved: FlattenMaps<AddressDoc> = model.toJSON();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...addressData } = addressSaved;
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          address: addressData,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async findAddressesByEmail(email: string) {
    try {
      const addresses = await this.addressModel.find({ email }).exec();
      if (!addresses || addresses.length === 0) {
        throw new NotFoundException('No addresses found for this email');
      }
      return addresses;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
