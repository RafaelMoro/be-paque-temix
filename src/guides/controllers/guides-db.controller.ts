import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { GuidesDbService } from '../services/guides-db.service';
import { CreateGuideDto } from '../dtos/guides-db.dto';
import { GuideResponseDto } from '../dtos/guides-db-responses.dto';

@ApiTags('Guides DB')
@UseGuards(JwtGuard)
@Controller('guides/db')
export class GuidesDbController {
  constructor(private readonly guidesDbService: GuidesDbService) {}

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new guide with database persistence' })
  @ApiResponse({ status: 201, type: GuideResponseDto })
  async createGuide(
    @Body() createGuideDto: CreateGuideDto,
    @Request() req: ExpressRequest,
  ): Promise<GuideResponseDto> {
    return this.guidesDbService.createGuide(req.user, createGuideDto);
  }
}
