import { GeneralResponse } from '@/global.interface';
import { AddressDoc } from './entities/addresses.entity';
import { Types } from 'mongoose';

export interface Address extends AddressDoc {
  _id: Types.ObjectId;
}

export interface AddressData {
  addressName: string;
  externalNumber: string;
  internalNumber?: string;
  reference?: string;
  zipcode: string;
  neighborhood: string;
  state: string;
  city: string[];
  town: string[];
  alias: string;
  isGEAddress?: boolean;
}

export interface CreateAddressResponse extends Omit<
  GeneralResponse,
  'data' | 'error'
> {
  error: null;
  data: {
    address: AddressData;
  };
}

export interface GetAddressesResponse extends Omit<
  GeneralResponse,
  'data' | 'error'
> {
  error: null;
  data: {
    addresses: AddressData[];
  };
}

export interface AddressesByAliasResponse extends Omit<
  GeneralResponse,
  'data' | 'error'
> {
  error: null;
  data: {
    address: {
      alias: string;
    };
  };
}
