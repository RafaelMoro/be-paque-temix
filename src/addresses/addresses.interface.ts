import { GeneralResponse } from '@/global.interface';
import { AddressDoc } from './entities/addresses.entity';
import { Types } from 'mongoose';

export interface Address extends AddressDoc {
  _id: Types.ObjectId;
}

export interface CreateAddressResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    address: Omit<AddressDoc, '_id' | 'email'>;
  };
}

export interface GetAddressesResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    addresses: Omit<AddressDoc, '_id' | 'email'>[];
  };
}

export interface AddressesByAliasResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    address: {
      alias: string;
    };
  };
}
