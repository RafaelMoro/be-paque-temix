import { IsString, IsNotEmpty, IsEmail, IsNumber } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

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
