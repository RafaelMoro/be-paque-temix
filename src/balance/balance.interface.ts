import { Role } from '@/users/users.interface';
import {
  AdminBalanceRequestItemDto,
  BalanceDataDto,
  BalanceRequestItemDto,
} from './dtos/balance-responses.dto';
import { AdminBalanceRequestFilter } from './balance.constants';

export type FormattedBalanceData = BalanceDataDto;
export type FormattedBalanceRequest = BalanceRequestItemDto;
export type FormattedAdminBalanceRequest = AdminBalanceRequestItemDto;

export interface BalanceCaller {
  email: string;
  name: string;
  lastName: string;
  role: Role[];
}

export interface BalanceRequestsFilter {
  month: number;
  year: number;
  page: number;
  limit: number;
  status?: AdminBalanceRequestFilter;
}
