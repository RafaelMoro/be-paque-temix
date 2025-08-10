import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsArray,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Role, RoleEnum } from '../users.interface';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly lastName: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ enum: RoleEnum, required: false })
  readonly role: Role[];

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly password: string;

  @IsString()
  @MinLength(10)
  @MaxLength(10)
  @IsNotEmpty()
  @ApiProperty({ default: '1234567890' })
  readonly phone: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  @MaxLength(10)
  @ApiProperty({ default: '1234567890', required: false })
  readonly secondPhone: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5)
  @IsNotEmpty()
  @ApiProperty({ default: '52641', required: false })
  readonly postalCode: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  readonly companyName: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  readonly address: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UpdateUserPasswordDto {
  @IsString()
  @IsNotEmpty()
  readonly password: string;

  @IsString()
  @IsNotEmpty()
  readonly uid: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}
