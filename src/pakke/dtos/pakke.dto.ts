import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class Parcel {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '5' })
  readonly Weight: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly Width: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '30' })
  readonly Height: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '20' })
  readonly Length: string;
}

export class GetQuotePakkeDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly ZipCodeFrom: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly ZipCodeTo: string;

  @ValidateNested({ each: true })
  @Type(() => Parcel)
  readonly Parcel: Parcel;
}

class PakkeParcelDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Electronics',
    description: 'Content description',
  })
  @MaxLength(50)
  readonly content: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({
    example: 30,
    description: 'Package length in cm',
  })
  readonly length: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({
    example: 20,
    description: 'Package width in cm',
  })
  readonly width: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({
    example: 10,
    description: 'Package height in cm',
  })
  readonly height: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({
    example: 5,
    description: 'Package weight in kg',
  })
  readonly weight: number;
}

class PakkeAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  readonly name: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @ApiProperty({
    example: '+52 55 1234 5678',
    description: 'Phone number',
  })
  readonly phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ApiProperty({
    example: 'ACME Corp',
    description: 'Company name',
    required: false,
  })
  readonly company?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({
    example: 'Calle Principal 123',
    description: 'Street address',
  })
  readonly street1: string;

  @IsBoolean()
  @ApiProperty({
    example: true,
    description: 'Whether the address is residential',
  })
  readonly isResidential: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @ApiProperty({
    example: 'Near the park',
    description: 'Additional address reference',
    required: false,
  })
  readonly street2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'Centro',
    description: 'Neighborhood',
  })
  readonly neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'Mexico City',
    description: 'City name',
  })
  readonly city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'CDMX',
    description: 'State or province',
  })
  readonly state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @ApiProperty({
    example: '06000',
    description: 'Postal code',
  })
  readonly zipcode: string;
}

class PakkeDestinationAddressDto extends PakkeAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({
    example: 'ACME Corp',
    description: 'Company name (mandatory for destination)',
  })
  declare readonly company: string;
}

export class CreateGuidePakkeRequestDto {
  @ValidateNested()
  @Type(() => PakkeParcelDto)
  @ApiProperty({
    type: PakkeParcelDto,
    description: 'Parcel information',
  })
  readonly parcel: PakkeParcelDto;

  @ValidateNested()
  @Type(() => PakkeAddressDto)
  @ApiProperty({
    type: PakkeAddressDto,
    description: 'Origin address',
  })
  readonly origin: PakkeAddressDto;

  @ValidateNested()
  @Type(() => PakkeDestinationAddressDto)
  @ApiProperty({
    type: PakkeDestinationAddressDto,
    description: 'Destination address',
  })
  readonly destination: PakkeDestinationAddressDto;
}

export class CreateGuidePakkeDataDto {
  @ApiProperty({ example: '794914961710' })
  trackingNumber: string;

  @ApiProperty({ example: 'Pakke' })
  carrier: string;

  @ApiProperty({ example: '450.75' })
  price: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'URL to view the guide online',
  })
  guideLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'https://example.com/label.pdf',
    description: 'URL to download the shipping label',
  })
  labelUrl: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Base64 encoded file content',
  })
  file: string | null;
}

export class CreateGuidePakkeDataWrapperDto {
  @ApiProperty({
    type: CreateGuidePakkeDataDto,
    nullable: true,
    description: 'Guide information or null if creation failed',
  })
  guide: CreateGuidePakkeDataDto | null;
}

export class CreateGuidePakkeResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({ type: [String], example: ['Guide created successfully'] })
  messages: string[];

  @ApiProperty({
    type: CreateGuidePakkeDataWrapperDto,
  })
  data: CreateGuidePakkeDataWrapperDto;
}

export class AddressGuideDto {
  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'Main Office' })
  alias: string;

  @ApiProperty({ example: 'Calle Principal' })
  street: string;

  @ApiProperty({ example: '123' })
  streetNumber: string;

  @ApiProperty({ example: 'Centro' })
  neighborhood: string;

  @ApiProperty({ example: 'Mexico City' })
  city: string;

  @ApiProperty({ example: 'CDMX' })
  state: string;
}

export class GetGuideDetailDto {
  @ApiProperty({ example: '794914961710' })
  trackingNumber: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '200e6cc0-33a6-11f1-91de-87f934bbe727',
    description: 'Shipment ID',
  })
  shipmentNumber: string | null;

  @ApiProperty({ example: 'Pkk' })
  source: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'Estafeta',
    description: 'Carrier name',
  })
  carrier: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '450.75',
    description: 'Guide price',
  })
  price: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'URL to view the guide online',
  })
  guideLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'URL to download the shipping label',
  })
  labelUrl: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Base64 encoded file content',
  })
  file: string | null;

  @ApiProperty({ example: 'ON_DELIVERY' })
  status: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'REF-1775701234567',
    description: 'Order reference number',
  })
  order: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: '794914961710',
    description: 'Guide number',
  })
  guide: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Tracking link URL',
  })
  trackingLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Shipping document link URL',
  })
  shippingLink: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: 'Estafeta',
    description: 'Courier type',
  })
  courier: string | null;

  @ApiProperty({
    type: AddressGuideDto,
    nullable: true,
    description: 'Origin address information',
  })
  origin: AddressGuideDto | null;

  @ApiProperty({
    type: AddressGuideDto,
    nullable: true,
    description: 'Destination address information',
  })
  destination: AddressGuideDto | null;
}

export class GetSingleGuideDataWrapperDto {
  @ApiProperty({
    type: GetGuideDetailDto,
    description: 'Guide information',
  })
  guide: GetGuideDetailDto;
}

export class GetSingleGuidePakkeResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'General message',
  })
  message: string | null;

  @ApiProperty({
    type: 'string',
    nullable: true,
    example: null,
    description: 'Error information if any',
  })
  error: null;

  @ApiProperty({ type: [String], example: [] })
  messages: string[];

  @ApiProperty({
    type: GetSingleGuideDataWrapperDto,
  })
  data: GetSingleGuideDataWrapperDto;
}
