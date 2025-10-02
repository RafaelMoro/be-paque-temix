import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GetQuoteT1Dto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '72000', description: 'Postal code of the origin' })
  readonly codigo_postal_origen: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
  })
  readonly codigo_postal_destino: string;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 5 })
  readonly peso: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 30 })
  readonly largo: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 20 })
  readonly alto: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 10 })
  readonly ancho: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly dias_embarque: number;

  @IsBoolean()
  @IsNotEmpty()
  @ApiProperty({ example: false })
  readonly seguro: boolean;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly valor_paquete: number;

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ example: 0 })
  readonly tipo_paquete: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123', description: 'Store id gotten from T1' })
  readonly comercio_id: string;
}

class ToneParcelDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Electronics',
    description: 'Content description',
  })
  readonly content: string;
}

class ToneAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'John',
    description: 'First and middle name',
  })
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'Doe',
    description: 'Last name',
  })
  readonly lastName: string;

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
    example: 'Zacatlan',
    description: 'Town name (Municipio)',
  })
  readonly town: string;

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
    example: 'Near the park',
    description: 'Reference for location',
  })
  readonly reference: string;
}

export class CreateGuideToneRequestDto {
  @ValidateNested()
  @Type(() => ToneParcelDto)
  @ApiProperty({
    type: ToneParcelDto,
    description: 'Parcel information',
  })
  readonly parcel: ToneParcelDto;

  @ValidateNested()
  @Type(() => ToneAddressDto)
  @ApiProperty({
    type: ToneAddressDto,
    description: 'Origin address',
  })
  readonly origin: ToneAddressDto;

  @ValidateNested()
  @Type(() => ToneAddressDto)
  @ApiProperty({
    type: ToneAddressDto,
    description: 'Destination address',
  })
  readonly destination: ToneAddressDto;
}
