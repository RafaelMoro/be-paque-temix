import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MaxLength,
  MinLength,
  Matches,
  IsEmail,
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

export class CreateGEAddressDto {
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
  @MinLength(2, {
    message: 'Name must be at least 2 characters long',
  })
  @MaxLength(100, {
    message: 'Name must not exceed 100 characters',
  })
  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Full name of the person',
    minLength: 2,
    maxLength: 100,
  })
  readonly name: string;

  @IsEmail(
    {},
    {
      message: 'Email must be a valid email address',
    },
  )
  @IsNotEmpty()
  @ApiProperty({
    example: 'juan.perez@example.com',
    description: 'Email address',
  })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Phone must be at least 10 characters long',
  })
  @MaxLength(15, {
    message: 'Phone must not exceed 15 characters',
  })
  @Matches(/^[0-9+\-\s()]+$/, {
    message: 'Phone must contain only numbers, spaces, +, -, and parentheses',
  })
  @ApiProperty({
    example: '+52 222 123 4567',
    description: 'Phone number',
    minLength: 10,
    maxLength: 15,
  })
  readonly phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'Company must be at least 2 characters long',
  })
  @MaxLength(100, {
    message: 'Company must not exceed 100 characters',
  })
  @ApiProperty({
    example: 'Empresa SA de CV',
    description: 'Company name',
    minLength: 2,
    maxLength: 100,
  })
  readonly company: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, {
    message: 'RFC must be at least 12 characters long',
  })
  @MaxLength(13, {
    message: 'RFC must not exceed 13 characters',
  })
  @Matches(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/, {
    message: 'RFC must have a valid Mexican RFC format',
  })
  @ApiProperty({
    example: 'XAXX010101000',
    description: 'Mexican RFC (Registro Federal de Contribuyentes)',
    minLength: 12,
    maxLength: 13,
  })
  readonly rfc: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5, {
    message: 'Street must be at least 5 characters long',
  })
  @MaxLength(200, {
    message: 'Street must not exceed 200 characters',
  })
  @ApiProperty({
    example: 'Avenida Juárez',
    description: 'Street name',
    minLength: 5,
    maxLength: 200,
  })
  readonly street: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, {
    message: 'Number must be at least 1 character long',
  })
  @MaxLength(10, {
    message: 'Number must not exceed 10 characters',
  })
  @ApiProperty({
    example: '123',
    description: 'Street number',
    minLength: 1,
    maxLength: 10,
  })
  readonly number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200, {
    message: 'Reference must not exceed 200 characters',
  })
  @ApiProperty({
    example: 'Entre calle A y calle B, edificio azul',
    description: 'Address reference or additional information',
    maxLength: 200,
  })
  readonly reference: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2, {
    message: 'Alias must be at least 2 characters long',
  })
  @MaxLength(50, {
    message: 'Alias must not exceed 50 characters',
  })
  @ApiProperty({
    example: 'Casa Principal',
    description: 'Address alias or nickname',
    minLength: 2,
    maxLength: 50,
  })
  readonly alias: string;
}
