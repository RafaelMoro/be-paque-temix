import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PakkeService } from '../services/pakke.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateGuidePakkeRequestDto } from '../dtos/pakke.dto';

@UseGuards(JwtGuard)
@Controller('pkk')
export class PakkeController {
  constructor(private pkkService: PakkeService) {}

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a guide for Pkk.',
  })
  async createGuide(@Body() payload: CreateGuidePakkeRequestDto) {
    return this.pkkService.createGuidePakke(payload);
  }
}
