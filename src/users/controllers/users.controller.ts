import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/users.dto';
import { Public } from '@/auth/decorators/public/public.decorator';
import { JwtGuardGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

@UseGuards(JwtGuardGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Get(':email')
  getUser(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Public()
  @Post()
  createUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload });
  }
}
