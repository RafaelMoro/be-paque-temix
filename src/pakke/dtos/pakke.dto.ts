import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '30',
    description: 'Package length in cm',
  })
  readonly length: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '20',
    description: 'Package width in cm',
  })
  readonly width: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '10',
    description: 'Package height in cm',
  })
  readonly height: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '5',
    description: 'Package weight in kg',
  })
  readonly weight: string;
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
  @Type(() => PakkeAddressDto)
  @ApiProperty({
    type: PakkeAddressDto,
    description: 'Destination address',
  })
  readonly destination: PakkeAddressDto;
}
