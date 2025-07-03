import { Body, Controller, Post } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/users.dto';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  // @Public()
  @Post()
  createUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload });
  }
}
