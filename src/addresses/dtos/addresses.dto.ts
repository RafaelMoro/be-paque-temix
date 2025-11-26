import {
  IsString,
  IsNotEmpty,
  IsArray,
  MinLength,
  MaxLength,
  IsOptional,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly addressName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly externalNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ default: '102', required: false })
  readonly internalNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    default: 'Casa a pie de calle con zaguan rojo',
    required: false,
  })
  readonly reference: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(5)
  @ApiProperty()
  readonly postalCode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly state: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ApiProperty()
  readonly city: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ApiProperty()
  readonly town: string[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly alias: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly sub: string;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
