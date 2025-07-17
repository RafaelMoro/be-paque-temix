import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  Request as RequestNest,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../services/users.service';
import { CreateUserDto, ResetPasswordDto } from '../dtos/users.dto';
import { Public } from '@/auth/decorators/public/public.decorator';
import { JwtGuardGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  refs,
} from '@nestjs/swagger';
import {
  CreateAdminUserResponseDto,
  CreateUserEmailExistResDto,
  CreateUserResponseDto,
  DeleteUserResNotFoundDto,
  DeleteUserResponseDto,
  ForgotPasswordBodyDto,
  ForgotPasswordResponseDto,
  JwtInvalidSignatureResErrorDto,
  JwtNotFoundResErrorDto,
  ResetPasswordResponseDto,
} from '../dtos/users-responses.dto';

@UseGuards(JwtGuardGuard)
@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  /**
   * Retrieves a user by their email address.
   */
  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Get(':email')
  @ApiOperation({
    summary:
      'Get user by email. Only admin users are allowed to access this endpoint.',
  })
  @ApiBearerAuth()
  getUser(@Param('email') email: string) {
    return this.userService.findByEmail(email);
  }

  /**
   * Creates a new user.
   */
  @Public()
  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a user.',
  })
  // Api responses
  @ApiResponse({
    status: 201,
    type: CreateUserResponseDto,
    description: 'User created successfully.',
  })
  @ApiResponse({
    status: 401,
    type: CreateUserEmailExistResDto,
    description: 'Email already exists.',
  })
  createUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload });
  }

  /**
   * Creates a new admin user.
   */
  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Post('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create an admin user. Only admin users are allowed to access this endpoint.',
  })
  @ApiBearerAuth()
  // Api responses
  @ApiResponse({
    status: 201,
    type: CreateAdminUserResponseDto,
    description: 'Admin user created successfully.',
  })
  createAdminUser(@Body() payload: CreateUserDto) {
    return this.userService.createUser({ data: payload, isAdmin: true });
  }

  /**
   * Forgot password feature
   */
  @Public()
  @Post('/forgot-password')
  @ApiOperation({
    summary: 'Send email to reset password',
  })
  @ApiResponse({
    status: 201,
    type: ForgotPasswordResponseDto,
    description: 'User deleted successfully.',
  })
  forgotPassword(@Body() payload: ForgotPasswordBodyDto) {
    return this.userService.forgotPassword(payload);
  }

  /**
   * Reset password feature
   */
  @Public()
  @Post('/reset-password/:oneTimeToken')
  @ApiOperation({
    summary: 'Reset password',
  })
  // Api responses
  @ApiResponse({
    status: 201,
    type: ResetPasswordResponseDto,
    description: 'Password reset successfully.',
  })
  @ApiExtraModels(JwtNotFoundResErrorDto, JwtInvalidSignatureResErrorDto)
  @ApiResponse({
    status: 400,
    schema: {
      anyOf: refs(JwtNotFoundResErrorDto, JwtInvalidSignatureResErrorDto),
    },
  })
  resetPassword(
    @Param('oneTimeToken') oneTimeToken: string,
    @Body() changes: ResetPasswordDto,
  ) {
    const { password } = changes;
    return this.userService.resetPassword(oneTimeToken, password);
  }

  /**
   * Deletes a user
   */
  @Delete()
  @ApiOperation({
    summary: 'Deletes your own user.',
  })
  @ApiBearerAuth()
  // Api Responses
  @ApiResponse({
    status: 200,
    type: DeleteUserResponseDto,
    description: 'User deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    type: DeleteUserResNotFoundDto,
    description: 'User not found.',
  })
  deleteUser(@RequestNest() request: Request) {
    const email: string | undefined = request?.user?.email;
    return this.userService.deleteUser(email);
  }
}
