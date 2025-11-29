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
  UpdateAddressDto,
} from '../dtos/addresses.dto';
import {
  Address,
  CreateAddressResponse,
  AddressesByAliasResponse,
  GetAddressesResponse,
} from '../addresses.interface';
import {
  ADDRESS_NOT_FOUND_ERROR,
  ALIAS_EXISTS_ERROR,
  EMAIL_MISSING_ERROR,
  MISSING_ALIAS_ERROR,
} from '../addresses.constants';

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
        throw new BadRequestException(EMAIL_MISSING_ERROR);
      }

      const aliasExists = await this.verifyAliasExists({
        alias: payload.alias,
        email,
      });
      if (aliasExists) {
        throw new BadRequestException(ALIAS_EXISTS_ERROR);
      }

      const npmVersion: string = this.configService.version!;
      const updatedPayload: CreateAddressDto = { ...payload, email };
      const newAddress = new this.addressModel(updatedPayload);
      const model: Address = await newAddress.save();
      const addressSaved: FlattenMaps<AddressDoc> = model.toJSON();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, email: emailProp, ...addressData } = addressSaved;
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

  async findAddressesByEmail(email: string): Promise<GetAddressesResponse> {
    try {
      const addresses = await this.addressModel.find({ email }).exec();
      if (!addresses || addresses.length === 0) {
        throw new NotFoundException(ADDRESS_NOT_FOUND_ERROR);
      }

      const npmVersion: string = this.configService.version!;
      const addressesFormated = addresses.map((addr) => {
        const addressObj: FlattenMaps<AddressDoc> = addr.toJSON();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...addressData } = addressObj;
        return addressData;
      });
      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          addresses: addressesFormated,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async deleteAddressByAliasAndEmail({
    alias,
    email,
  }: {
    alias: string;
    email: string;
  }): Promise<AddressesByAliasResponse> {
    try {
      const npmVersion: string = this.configService.version!;
      const address = await this.addressModel
        .findOneAndDelete({ alias, email })
        .exec();
      if (!address) {
        throw new NotFoundException(ADDRESS_NOT_FOUND_ERROR);
      }

      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          address: {
            alias: address.alias,
          },
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async updateAddress({
    payload,
    email,
  }: {
    payload: UpdateAddressDto;
    email: string;
  }): Promise<AddressesByAliasResponse> {
    try {
      const alias = payload.alias;
      if (!alias) {
        throw new BadRequestException(MISSING_ALIAS_ERROR);
      }
      const npmVersion: string = this.configService.version!;
      const addressToEdit = await this.addressModel
        .findOneAndUpdate({ email, alias }, { $set: payload }, { new: true })
        .exec();
      if (!addressToEdit) {
        throw new NotFoundException(ADDRESS_NOT_FOUND_ERROR);
      }

      return {
        version: npmVersion,
        message: null,
        error: null,
        data: {
          address: {
            alias: addressToEdit.alias,
          },
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
