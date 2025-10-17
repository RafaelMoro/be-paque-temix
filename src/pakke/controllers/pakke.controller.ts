import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PakkeService } from '../services/pakke.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CreateGuidePakkeRequestDto,
  CreateGuidePakkeResponseDto,
} from '../dtos/pakke.dto';

@UseGuards(JwtGuard)
@Controller('pkk')
export class PakkeController {
  constructor(private pkkService: PakkeService) {}

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a guide for Pkk.',
  })
  @ApiResponse({
    status: 201,
    type: CreateGuidePakkeResponseDto,
    description: 'Guide created successfully.',
  })
  async createGuide(@Body() payload: CreateGuidePakkeRequestDto) {
    return this.pkkService.createGuidePakke(payload);
  }
}
