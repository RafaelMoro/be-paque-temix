import { RoleEnum } from '@/users/users.interface';
import { ApiProperty, ApiSchema } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

@ApiSchema({ name: 'LoginDto' })
export class LoginDto {
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
export class LoginResponseUser {
  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ enum: RoleEnum })
  role: string[];
}

export class LoginResponse {
  @ApiProperty({ type: () => LoginResponseUser })
  user: LoginResponseUser;
}

export class LoginResponseUnauthorizedError {
  @ApiProperty()
  message: string;

  @ApiProperty()
  error: string;

  @ApiProperty()
  statusCode: number;
}

export class LoginResponseUnauthorized {
  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'null', nullable: true })
  data: null;

  @ApiProperty({ type: 'null', nullable: true })
  message: null;

  @ApiProperty({ type: () => LoginResponseUnauthorizedError })
  error: LoginResponseUnauthorizedError;
}
