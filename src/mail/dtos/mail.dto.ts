import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class MailForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'example@mail.com' })
  readonly email: string;

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
  readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Doe' })
  readonly lastName: string;
}
