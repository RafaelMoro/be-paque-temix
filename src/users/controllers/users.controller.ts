import {
  Body,
  Controller,
  // Get,
  // Param,
  Post,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/users.dto';
import { Public } from '@/auth/decorators/public/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  // @Get(':email')
  // getUser(@Param('email') email: string) {
  //   return this.userService.findByEmail(email);
  // }

  @Public()
  @Post()
  createUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload });
  }
}
