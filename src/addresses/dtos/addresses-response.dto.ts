import { ApiProperty } from '@nestjs/swagger';
import {
  ADDRESS_NOT_FOUND_ERROR,
  ALIAS_EXISTS_ERROR,
  EMAIL_MISSING_ERROR,
  MISSING_ALIAS_ERROR,
} from '../addresses.constants';

//#region Create address
class CreateAddressDataDto {
  @ApiProperty({ example: 'Home' })
  addressName: string;

  @ApiProperty({ example: '123' })
  externalNumber: string;

  @ApiProperty({ example: '4B', required: false })
  internalNumber: string;

  @ApiProperty({ example: 'Near the park', required: false })
  reference: string;

  @ApiProperty({ example: '12345' })
  postalCode: string;

  @ApiProperty({ example: 'California' })
  state: string;

  @ApiProperty({ example: 'Los Angeles', isArray: true })
  city: string[];

  @ApiProperty({ example: 'Downtown', isArray: true })
  town: string[];

  @ApiProperty({ example: 'My Home Address' })
  alias: string;

  @ApiProperty({ example: 'john.doe@mail.com' })
  email: string;
}

export class CreateAddressDataWrapperDto {
  @ApiProperty({ type: CreateAddressDataDto })
  address: CreateAddressDataDto;
}

export class CreateAddressResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: string | null;

  @ApiProperty({ type: CreateAddressDataWrapperDto })
  data: CreateAddressDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
//#endregion

//#region Get addresses
export class GetAddressesDataWrapperDto {
  @ApiProperty({ type: CreateAddressDataDto, isArray: true })
  addresses: CreateAddressDataDto[];
}

export class GetAddressesResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: string | null;

  @ApiProperty({ type: GetAddressesDataWrapperDto })
  data: GetAddressesDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
//#endregion

//#region Delete address by alias
class DeleteAddressDataDto {
  @ApiProperty({ example: 'My Home Address' })
  alias: string;
}

export class DeleteAddressDataWrapperDto {
  @ApiProperty({ type: DeleteAddressDataDto })
  address: DeleteAddressDataDto;
}

export class DeleteAddressByAliasResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: string | null;

  @ApiProperty({ type: DeleteAddressDataWrapperDto })
  data: DeleteAddressDataWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
//#endregion

//#region Error responses
class ErrorDetailDto {
  @ApiProperty({ example: ADDRESS_NOT_FOUND_ERROR })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 400 })
  statusCode: number;
}

export class ErrorResponseDto {
  @ApiProperty({ example: '0.25.4' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: ErrorDetailDto })
  error: ErrorDetailDto;
}

class MissingAliasErrorDetailDto {
  @ApiProperty({ example: MISSING_ALIAS_ERROR })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 400 })
  statusCode: number;
}

export class MissingAliasErrorResponseDto {
  @ApiProperty({ example: '0.25.4' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: MissingAliasErrorDetailDto })
  error: MissingAliasErrorDetailDto;
}

class EmailMissingErrorDetailDto {
  @ApiProperty({ example: EMAIL_MISSING_ERROR })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 400 })
  statusCode: number;
}

export class EmailMissingErrorResponseDto {
  @ApiProperty({ example: '0.25.4' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: EmailMissingErrorDetailDto })
  error: EmailMissingErrorDetailDto;
}

class AliasExistsErrorDetailDto {
  @ApiProperty({ example: ALIAS_EXISTS_ERROR })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 400 })
  statusCode: number;
}

export class AliasExistsErrorResponseDto {
  @ApiProperty({ example: '0.25.4' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: AliasExistsErrorDetailDto })
  error: AliasExistsErrorDetailDto;
}
//#endregion
