import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { UsersService } from '@/users/services/users.service';
import { GuidesDbService } from '../services/guides-db.service';
import { CreateGuideDto } from '../dtos/guides-db.dto';
import { GuideResponseDto } from '../dtos/guides-db-responses.dto';

@ApiTags('Guides DB')
@UseGuards(JwtGuard)
@Controller('guides/db')
export class GuidesDbController {
  constructor(
    private readonly guidesDbService: GuidesDbService,
    private readonly usersService: UsersService,
  ) {}

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new guide with database persistence' })
  @ApiResponse({ status: 201, type: GuideResponseDto })
  async createGuide(
    @Body() createGuideDto: CreateGuideDto,
    @Request() req: ExpressRequest,
  ): Promise<GuideResponseDto> {
    const email = req.user?.email as string;
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // ponytail: reuse HTTP exception instead of KraftError filter until Phase 6
      throw new Error('User not found');
    }
    return this.guidesDbService.createGuide(
      user._id.toString(),
      createGuideDto,
    );
  }
}
