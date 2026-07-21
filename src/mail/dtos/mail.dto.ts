import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class MailForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'example@mail.com' })
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'https://my-api.com' })
  readonly hostname: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30',
  })
  readonly oneTimeToken: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'John' })
  readonly name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe' })
  readonly lastName: string;
}

export class MailBalanceRequestCreatedDto {
  @IsArray()
  @IsEmail({}, { each: true })
  readonly adminEmails: string[];

  @IsString()
  @IsNotEmpty()
  readonly requesterName: string;

  @IsNumber()
  readonly amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly paymentReference?: string;

  @IsDate()
  readonly createdAt: Date;
}

export class MailBalanceRequestDecisionDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsIn(['approved', 'rejected'])
  readonly action: 'approved' | 'rejected';

  @IsNumber()
  readonly amount: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  readonly reason?: string;
}
