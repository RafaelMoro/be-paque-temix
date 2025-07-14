import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsNumber,
  IsArray,
  IsOptional,
  ValidateIf,
  MinLength,
  MaxLength,
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

  @IsNumber()
  @IsNotEmpty()
  @ApiProperty({ default: 1234567890 })
  readonly phone: number;

  @ValidateIf((obj: CreateUserDto) => obj.secondPhone !== null) // Skip validation if null
  @IsOptional()
  @IsNumber()
  @ApiProperty({ default: 1234567890, required: false })
  readonly secondPhone: number;

  @IsString()
  @MinLength(4)
  @MaxLength(4)
  @IsNotEmpty()
  @ApiProperty({ default: '5264', required: false })
  readonly postalCode: string;

  @IsString()
  @ApiProperty({ required: false })
  readonly companyName: string;

  @IsString()
  @ApiProperty({ required: false })
  readonly address: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
