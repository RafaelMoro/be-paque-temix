import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AddressDoc } from '../entities/addresses.entity';
import {
  CreateAddressDto,
  CreateAddressDtoPayload,
} from '../dtos/addresses.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(AddressDoc.name)
    private addressModel: Model<AddressDoc>,
  ) {}

  async createAddress({
    payload,
    sub,
  }: {
    payload: CreateAddressDtoPayload;
    sub: string;
  }) {
    try {
      // something
      const updatedPayload: CreateAddressDto = { ...payload, sub };
      const newAddress = new this.addressModel(updatedPayload);
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
