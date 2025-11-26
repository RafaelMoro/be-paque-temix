import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Address } from '../entities/addresses.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectModel(Address.name)
    private addressModel: Model<Address>,
  ) {}
}
