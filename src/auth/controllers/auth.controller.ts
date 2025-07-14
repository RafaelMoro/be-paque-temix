import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from '../services/auth.service';
import { User } from '@/users/entities/users.entity';
import { LOCAL_STRATEGY } from '../auth.constant';
import { ACCESS_TOKEN_COOKIE_NAME, PROD_ENV } from '@/app.constant';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  LoginBodyDto,
  LoginResponseDto,
  LoginResponseUnauthorized,
} from '../dtos/auth-responses.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Log in locally using email and password.
   */
  @UseGuards(AuthGuard(LOCAL_STRATEGY))
  @Post()
  @ApiOperation({
    summary: 'Log in endpoint.',
  })
  @ApiBody({ type: LoginBodyDto })
  @ApiResponse({
    status: 201,
    type: LoginResponseDto,
    description: 'User logged in successfully.',
  })
  @ApiResponse({
    status: 401,
    type: LoginResponseUnauthorized,
    description: 'Email or password incorrect.',
  })
  loginLocal(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = request.user as User;

    const res = this.authService.generateJWTAuth(user);
    response.cookie(ACCESS_TOKEN_COOKIE_NAME, res.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === PROD_ENV,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 5, // 5 days
    });
    return {
      user: res.user,
    };
  }
}
