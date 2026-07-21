import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  ADMIN_BALANCE_REQUEST_FILTERS,
  BALANCE_REQUEST_MAX_AMOUNT,
  AdminBalanceRequestFilter,
  BalanceRequestStatus,
} from '../balance.constants';

export class CreateBalanceRequestDto {
  @ApiProperty({ example: 150.5, maximum: BALANCE_REQUEST_MAX_AMOUNT })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(BALANCE_REQUEST_MAX_AMOUNT)
  amount: number;

  @ApiPropertyOptional({ example: 'SPEI-123456' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentReference?: string;
}

export class GetBalanceRequestsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year?: number;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}

export class GetAdminBalanceRequestsQueryDto extends GetBalanceRequestsQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_BALANCE_REQUEST_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn(ADMIN_BALANCE_REQUEST_FILTERS)
  status?: AdminBalanceRequestFilter;
}

@ValidatorConstraint({ name: 'balanceDecisionPaymentReference', async: false })
class BalanceDecisionPaymentReferenceConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as DecideBalanceRequestDto;

    if (dto.action === 'approve') {
      return typeof value === 'string' && value.trim().length > 0;
    }

    return value === undefined;
  }

  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as DecideBalanceRequestDto;
    return dto.action === 'approve'
      ? 'paymentReference is required when approving a balance request.'
      : 'paymentReference is not allowed when rejecting a balance request.';
  }
}

export class DecideBalanceRequestDto {
  @ApiProperty({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @Validate(BalanceDecisionPaymentReferenceConstraint)
  paymentReference?: string;
}

export { BalanceRequestStatus };
