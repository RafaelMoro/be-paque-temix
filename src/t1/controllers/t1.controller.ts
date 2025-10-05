import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { T1Service } from '../services/t1.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CreateGuideToneRequestDto,
  CreateGuideToneResponseDto,
} from '../dtos/t1.dtos';

@UseGuards(JwtGuard)
@Controller('tone')
export class T1Controller {
  constructor(private t1Service: T1Service) {}

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a guide for T1.',
  })
  @ApiResponse({
    status: 201,
    type: CreateGuideToneResponseDto,
    description: 'Guide created successfully.',
  })
  async createGuide(@Body() payload: CreateGuideToneRequestDto) {
    return this.t1Service.createGuide(payload);
  }
}
