import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ManuableService } from '../services/manuable.service';
import { CreateGuideMnRequestDto } from '../manuable.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateGuideResponseDto } from '../dtos/manuable-responses.dto';

@UseGuards(JwtGuard)
@Controller('mn')
export class ManuableController {
  constructor(private manuableService: ManuableService) {}

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a guide for Mn.',
  })
  @ApiResponse({
    status: 201,
    type: CreateGuideResponseDto,
    description: 'Guide created successfully.',
  })
  async createGuide(@Body() payload: CreateGuideMnRequestDto) {
    return this.manuableService.retrieveManuableGuide(payload);
  }
}
