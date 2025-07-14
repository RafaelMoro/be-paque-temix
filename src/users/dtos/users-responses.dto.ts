import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ type: CreateUserDataDto })
  data: {
    user: CreateUserDataDto;
  };

  @ApiProperty({ type: 'null', nullable: true, example: null })
  error: null;
}
