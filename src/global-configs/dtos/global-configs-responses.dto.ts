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

  @ApiProperty({ example: 'User created' })
  message: string;

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
  @ApiProperty()
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
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => GetMarginProfitForbiddenError })
  error: GetMarginProfitForbiddenError;
}
