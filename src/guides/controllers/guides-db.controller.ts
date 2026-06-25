import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import { GuidesDbService } from '../services/guides-db.service';
import {
  CreateGuideDto,
  GetAdminGuidesQueryDto,
  GetGuidesQueryDto,
} from '../dtos/guides-db.dto';
import {
  GuideResponseDto,
  PaginatedGuidesResponseDto,
} from '../dtos/guides-db-responses.dto';

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

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guides for authenticated user' })
  @ApiResponse({ status: 200, type: PaginatedGuidesResponseDto })
  async getUserGuides(
    @Query() query: GetGuidesQueryDto,
    @Request() req: ExpressRequest,
  ): Promise<PaginatedGuidesResponseDto> {
    return this.guidesDbService.getGuidesByUser(req.user, query);
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get guides with admin scope' })
  @ApiResponse({ status: 200, type: PaginatedGuidesResponseDto })
  async getAdminGuides(
    @Query() query: GetAdminGuidesQueryDto,
    @Request() req: ExpressRequest,
  ): Promise<PaginatedGuidesResponseDto> {
    return this.guidesDbService.getAllGuides(query, req.user);
  }

  @Get(':guideId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get guide detail' })
  @ApiResponse({ status: 200, type: GuideResponseDto })
  async getGuide(
    @Param('guideId') guideId: string,
    @Request() req: ExpressRequest,
  ): Promise<GuideResponseDto> {
    const isAdmin = req.user?.role?.includes('admin') ?? false;
    return this.guidesDbService.getGuideById(guideId, req.user, isAdmin);
  }
}
