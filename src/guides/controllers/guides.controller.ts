import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

import { GuidesService } from '../services/guides.service';
import { GetGuidesResponseDto } from '../dtos/guides.dto';

@UseGuards(JwtGuard)
@Controller('guides')
export class GuidesController {
  constructor(private guidesService: GuidesService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a single guide for Pkk.',
  })
  @ApiResponse({
    status: 200,
    type: GetGuidesResponseDto,
    description: 'Guides retrieved successfully from all providers.',
  })
  async getGuides() {
    return this.guidesService.getGuides();
  }
}
