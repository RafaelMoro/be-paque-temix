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
