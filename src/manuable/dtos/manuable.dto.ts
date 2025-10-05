import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';

class MnParcelDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'SAT001',
    description: 'SAT product ID',
  })
  readonly satProductId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Electronics',
    description: 'Content description',
  })
  readonly content: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({
    example: 1000,
    description: 'Value of the parcel',
  })
  readonly value: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  @ApiProperty({
    example: 1,
    description: 'Quantity of items',
  })
  readonly quantity: number;
}

class MnAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Calle Principal 123',
    description: 'Street address',
  })
  readonly street1: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Centro',
    description: 'Neighborhood',
  })
  readonly neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123',
    description: 'External number',
  })
  readonly external_number: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Mexico City',
    description: 'City name',
  })
  readonly city: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'ACME Corp',
    description: 'Company name',
  })
  readonly company: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'CDMX',
    description: 'State or province',
  })
  readonly state: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '+52 55 1234 5678',
    description: 'Phone number',
  })
  readonly phone: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'MX',
    description: 'Country code',
  })
  readonly country: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Near the park',
    description: 'Reference for location',
  })
  readonly reference: string;
}

export class CreateGuideMnRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'quote-uuid-123',
    description: 'Quote ID to create guide for',
  })
  readonly quoteId: string;

  @ValidateNested()
  @Type(() => MnParcelDto)
  @ApiProperty({
    type: MnParcelDto,
    description: 'Parcel information',
  })
  readonly parcel: MnParcelDto;

  @ValidateNested()
  @Type(() => MnAddressDto)
  @ApiProperty({
    type: MnAddressDto,
    description: 'Origin address',
  })
  readonly origin: MnAddressDto;

  @ValidateNested()
  @Type(() => MnAddressDto)
  @ApiProperty({
    type: MnAddressDto,
    description: 'Destination address',
  })
  readonly destination: MnAddressDto;
}
