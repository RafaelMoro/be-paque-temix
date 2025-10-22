import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class GetQuoteDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @MaxLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @Matches(/^[0-9]+$/, {
    message: 'Origin postal code must contain only numbers',
  })
  @ApiProperty({
    example: '72000',
    description: 'Postal code of the origin',
    minLength: 5,
    maxLength: 5,
  })
  readonly originPostalCode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @MaxLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @Matches(/^[0-9]+$/, {
    message: 'Origin postal code must contain only numbers',
  })
  @ApiProperty({
    example: '94298',
    description: 'Postal code of the destination',
    minLength: 5,
    maxLength: 5,
  })
  readonly destinationPostalCode: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 5 })
  readonly weight: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 30 })
  readonly length: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 20 })
  readonly height: number;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  @ApiProperty({ example: 10 })
  readonly width: number;
}

export class GetNeighborhoodInfoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @MaxLength(5, {
    message: 'Origin postal code must be 5 characters long',
  })
  @Matches(/^[0-9]+$/, {
    message: 'Origin postal code must contain only numbers',
  })
  @ApiProperty({
    example: '72000',
    description: 'Postal code of the origin',
    minLength: 5,
    maxLength: 5,
  })
  readonly zipcode: string;
}

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Zipcode must be 5 characters long',
  })
  @MaxLength(5, {
    message: 'Zipcode must be 5 characters long',
  })
  @Matches(/^[0-9]+$/, {
    message: 'Zipcode must contain only numbers',
  })
  @ApiProperty({
    example: '72000',
    description: 'Postal code of the address',
    minLength: 5,
    maxLength: 5,
  })
  readonly zipcode: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'Neighborhood must be at least 2 characters long',
  })
  @MaxLength(100, {
    message: 'Neighborhood must not exceed 100 characters',
  })
  @ApiProperty({
    example: 'Centro',
    description: 'Neighborhood name',
    minLength: 2,
    maxLength: 100,
  })
  readonly neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'City must be at least 2 characters long',
  })
  @MaxLength(100, {
    message: 'City must not exceed 100 characters',
  })
  @ApiProperty({
    example: 'Heroica Puebla de Zaragoza',
    description: 'City name',
    minLength: 2,
    maxLength: 100,
  })
  readonly city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'State must be at least 2 characters long',
  })
  @MaxLength(100, {
    message: 'State must not exceed 100 characters',
  })
  @ApiProperty({
    example: 'Puebla',
    description: 'State name',
    minLength: 2,
    maxLength: 100,
  })
  readonly state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500, {
    message: 'Other fields must not exceed 500 characters',
  })
  @ApiProperty({
    example: 'Additional address information',
    description: 'Other fields for additional address information',
    maxLength: 500,
  })
  readonly otherFields: string;
}
