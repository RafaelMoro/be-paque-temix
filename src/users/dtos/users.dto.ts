import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsArray,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Role } from '../users.interface';

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
  readonly secondPhone: number;

  @IsNumber()
  @IsNotEmpty()
  readonly postalCode: number;

  @IsString()
  readonly companyName: string;

  @IsString()
  readonly address: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
