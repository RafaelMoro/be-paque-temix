import { GeneralResponse } from '@/global.interface';
import { AddressDoc } from './entities/addresses.entity';

export interface Address extends AddressDoc {
  _id: unknown;
}

export interface CreateAddressResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    address: Omit<AddressDoc, '_id'>;
  };
}

export interface GetAddressesResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  data: {
    addresses: Omit<AddressDoc, '_id'>[];
  };
}
