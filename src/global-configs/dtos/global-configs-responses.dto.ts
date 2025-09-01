import { ApiProperty } from '@nestjs/swagger';

class GetMarginProfitDataDto {
  @ApiProperty({ example: '13' })
  value: number;

  @ApiProperty({ example: 'percentage' })
  type: string;
}

export class GetMarginProfitDataWrapperDto {
  @ApiProperty({ type: GetMarginProfitDataDto })
  profitMargin: GetMarginProfitDataDto;
}

export class GetMarginProfitResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: GetMarginProfitDataWrapperDto })
  data: GetMarginProfitDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class GetMarginProfitUnauthorizedError {
  @ApiProperty({ default: 'Unauthorized.' })
  message: string;

  @ApiProperty({ default: 400 })
  statusCode: number;
}

export class GetMarginProfitUnauthorizedErrorDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => GetMarginProfitUnauthorizedError })
  error: GetMarginProfitUnauthorizedError;
}

class GetMarginProfitForbiddenError {
  @ApiProperty({ default: 'Forbidden resource.' })
  message: string;

  @ApiProperty({ default: 'Forbidden' })
  error: string;

  @ApiProperty({ default: 400 })
  statusCode: number;
}

export class GetMarginProfitForbiddenErrorDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => GetMarginProfitForbiddenError })
  error: GetMarginProfitForbiddenError;
}

class GetMarginProfitNotFoundError {
  @ApiProperty({ default: 'Profit margin not found.' })
  message: string;

  @ApiProperty({ default: 'Not Found' })
  error: string;

  @ApiProperty({ default: 404 })
  statusCode: number;
}

export class GetMarginProfitNotFoundErrorDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => GetMarginProfitNotFoundError })
  error: GetMarginProfitNotFoundError;
}

class CourierConfigDto {
  @ApiProperty({ example: 'Estafeta' })
  name: string;

  @ApiProperty({ type: GetMarginProfitDataDto })
  profitMargin: GetMarginProfitDataDto;
}

class ProvidersConfigDto {
  @ApiProperty({ example: 'Pkk' })
  name: string;

  @ApiProperty({ type: [CourierConfigDto] })
  couriers: CourierConfigDto[];
}

export class UpdateProvidersProfitMarginWrapperDto {
  @ApiProperty({ type: [ProvidersConfigDto] })
  providers: ProvidersConfigDto[];
}

export class UpdateProvidersProfitMarginResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Profit margin created' })
  message: string;

  @ApiProperty({ type: UpdateProvidersProfitMarginWrapperDto })
  data: UpdateProvidersProfitMarginWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class UpdateGlobalProfitMarginWrapperDto {
  @ApiProperty({ type: GetMarginProfitDataDto })
  globalMarginProfit: GetMarginProfitDataDto;
}

export class UpdateGlobalProfitMarginResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Profit margin created' })
  message: string;

  @ApiProperty({ type: UpdateGlobalProfitMarginWrapperDto })
  data: UpdateGlobalProfitMarginWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
