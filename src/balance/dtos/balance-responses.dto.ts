import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BalanceRequestStatus } from '../balance.constants';

export class BalanceDataDto {
  @ApiProperty({ example: 150.5 })
  amount: number;
}

export class BalanceResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: BalanceDataDto })
  data: { balance: BalanceDataDto };

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty({ nullable: true })
  error: string | object | null;
}

export class BalanceRequestItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  amount: number;

  @ApiPropertyOptional()
  paymentReference?: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'cancelled'] })
  status: BalanceRequestStatus;

  @ApiPropertyOptional()
  decisionReason?: string;

  @ApiPropertyOptional()
  decisionAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdminBalanceRequestItemDto extends BalanceRequestItemDto {
  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  userName: string;

  @ApiProperty({ nullable: true })
  adminInCharge: string | null;
}

export class BalanceRequestResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: BalanceRequestItemDto })
  data: { request: BalanceRequestItemDto };

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty({ nullable: true })
  error: string | object | null;
}

export class AdminBalanceRequestResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: AdminBalanceRequestItemDto })
  data: { request: AdminBalanceRequestItemDto };

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty({ nullable: true })
  error: string | object | null;
}

export class PaginatedBalanceRequestsDataDto {
  @ApiProperty({ type: [BalanceRequestItemDto] })
  requests: BalanceRequestItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedBalanceRequestsResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: PaginatedBalanceRequestsDataDto })
  data: PaginatedBalanceRequestsDataDto;

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty({ nullable: true })
  error: string | object | null;
}

export class PaginatedAdminBalanceRequestsDataDto {
  @ApiProperty({ type: [AdminBalanceRequestItemDto] })
  requests: AdminBalanceRequestItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class PaginatedAdminBalanceRequestsResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: PaginatedAdminBalanceRequestsDataDto })
  data: PaginatedAdminBalanceRequestsDataDto;

  @ApiProperty({ nullable: true })
  message: string | null;

  @ApiProperty({ nullable: true })
  error: string | object | null;
}
