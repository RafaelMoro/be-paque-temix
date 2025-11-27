import {
  IsString,
  IsNotEmpty,
  IsArray,
  MinLength,
  MaxLength,
  IsOptional,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';

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
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  readonly email: string;
}

export class CreateAddressDtoPayload extends OmitType(CreateAddressDto, [
  'email',
] as const) {}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
