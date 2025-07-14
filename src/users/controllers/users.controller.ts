import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dtos/users.dto';
import { Public } from '@/auth/decorators/public/public.decorator';
import { JwtGuardGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@UseGuards(JwtGuardGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Get(':email')
  @ApiOperation({
    summary:
      'Get user by email. Only admin users are allowed to access this endpoint.',
  })
  getUser(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Create a user.',
  })
  createUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload });
  }

  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Post('admin')
  @ApiOperation({
    summary:
      'Create an admin user. Only admin users are allowed to access this endpoint.',
  })
  @ApiBearerAuth()
  createAdminUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload, isAdmin: true });
  }
}
