import { ApiProperty } from '@nestjs/swagger';

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
