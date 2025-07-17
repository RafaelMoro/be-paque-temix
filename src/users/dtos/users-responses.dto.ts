import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordBodyDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty({ example: 'john.doe@mail.com' })
  readonly email: string;
}

//#region Create user
class CreateUserDataDto {
  @ApiProperty({ example: 'john.doe@mail.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  name: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: ['user'], isArray: true, required: false })
  role: string[];
}

export class CreateUserResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'User created' })
  message: string;

  @ApiProperty({ type: CreateUserDataDto })
  data: {
    user: CreateUserDataDto;
  };

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class CreateAdminUserDataDto {
  @ApiProperty({ example: 'john.doe@mail.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  name: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: ['user', 'admin'], isArray: true, required: false })
  role: string[];
}

export class CreateAdminUserResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Admin user created' })
  message: string;

  @ApiProperty({ type: CreateAdminUserDataDto })
  data: {
    user: CreateAdminUserDataDto;
  };

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class CreateUserEmailExistError {
  @ApiProperty({ default: 'Try with other email.' })
  message: string;

  @ApiProperty({ default: 'Bad Request' })
  error: string;

  @ApiProperty({ default: 400 })
  statusCode: number;
}

export class CreateUserEmailExistResDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => CreateUserEmailExistError })
  error: CreateUserEmailExistError;
}

//#region Delete user
class DeleteUserDataDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;
}

export class DeleteUserResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'User deleted' })
  message: string;

  @ApiProperty({ type: DeleteUserDataDto })
  data: {
    user: DeleteUserDataDto;
  };

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class DeleteUserNotFoundError {
  @ApiProperty({ default: 'User not found.' })
  message: string;

  @ApiProperty({ default: 'Bad Request' })
  error: string;

  @ApiProperty({ default: 400 })
  statusCode: number;
}

export class DeleteUserResNotFoundDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => DeleteUserNotFoundError })
  error: DeleteUserNotFoundError;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Email sent' })
  message: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'Reset Password Successfully' })
  message: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}

class JwtNotFoundError {
  @ApiProperty({ example: 'JWT not found.' })
  message: string;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ default: 400 })
  statusCode: number;
}

export class JwtNotFoundResErrorDto {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data: null;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  message: null;

  @ApiProperty({ type: () => JwtNotFoundError })
  error: JwtNotFoundError;
}
