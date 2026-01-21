import {
  IsString,
  IsNotEmpty,
  IsArray,
  MinLength,
  MaxLength,
  IsOptional,
  ArrayMinSize,
  IsEmail,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Home' })
  readonly addressName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: '123' })
  readonly externalNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: '4B', required: false })
  readonly internalNumber: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Near the park',
    required: false,
  })
  readonly reference: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(5)
  @ApiProperty({ example: '12345' })
  readonly zipcode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Downtown' })
  readonly neighborhood: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'California' })
  readonly state: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ApiProperty({ example: 'Los Angeles', isArray: true })
  readonly city: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ApiProperty({ example: 'Downtown', isArray: true })
  readonly town: string[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'My Home Address' })
  readonly alias: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'john.doe@mail.com' })
  readonly email: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ example: true, required: false })
  readonly isGEAddress: boolean;
}

export class CreateAddressDtoPayload extends OmitType(CreateAddressDto, [
  'email',
] as const) {}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
