import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Role, RoleEnum } from '../users.interface';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  @ApiProperty({ enum: RoleEnum })
  readonly role: Role[];

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly password: string;

  @IsNumber()
  @IsNotEmpty()
  readonly phone: number;

  @IsNumber()
  @ApiProperty({ required: false })
  readonly secondPhone: number;

  @IsNumber()
  @IsNotEmpty()
  readonly postalCode: number;

  @IsString()
  @ApiProperty({ required: false })
  readonly companyName: string;

  @IsString()
  @ApiProperty({ required: false })
  readonly address: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
