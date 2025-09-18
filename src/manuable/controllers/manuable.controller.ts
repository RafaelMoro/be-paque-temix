import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ManuableService } from '../services/manuable.service';
import { GetHistoryGuidesPayload } from '../manuable.interface';
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
    return this.manuableService.createGuideWithAutoRetry(payload);
  }

  @Get('guides')
  async getGuides(@Query('trackingNumber') trackingNumber?: string) {
    const payload: GetHistoryGuidesPayload = {
      tracking_number: trackingNumber,
    };
    return this.manuableService.getHistoryGuidesWithAutoRetry(payload);
  }
}
