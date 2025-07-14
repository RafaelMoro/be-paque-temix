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
  user: LoginResponseUser;
}
