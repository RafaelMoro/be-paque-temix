import { RoleEnum } from '@/users/users.interface';
import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

@ApiSchema({ name: 'LoginBodyDto' })
export class LoginBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly password: string;
}

@ApiSchema({
  name: 'LoginResponseUser',
  description: 'user object in login response',
})
export class LoginUserDataDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: RoleEnum })
  role: string[];
}

export class LoginResponseDto {
  @ApiProperty({ type: () => LoginUserDataDto })
  user: LoginUserDataDto;
}

export class LoginUnauthorizedErrorDto {
  @ApiProperty({ default: 'Email or Password incorrect.' })
  message: string;

  @ApiProperty({ default: 'Unauthorized' })
  error: string;

  @ApiProperty({ default: 401 })
  statusCode: number;
}

export class LoginUnauthorizedResponseDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => LoginUnauthorizedErrorDto })
  error: LoginUnauthorizedErrorDto;
}
