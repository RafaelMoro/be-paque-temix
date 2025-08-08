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
  @ApiProperty({ example: 'john.doe@mail.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  name: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: RoleEnum })
  role: string[];
}

export class LoginUserDataDtoWrapperDto {
  @ApiProperty({ type: LoginUserDataDto })
  user: LoginUserDataDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: LoginUserDataDtoWrapperDto })
  data: LoginUserDataDtoWrapperDto;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
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
