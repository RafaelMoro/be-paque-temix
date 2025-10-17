import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PakkeService } from '../services/pakke.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@UseGuards(JwtGuard)
@Controller('pkk')
export class PakkeController {
  constructor(private pkkService: PakkeService) {}

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a guide for Pkk.',
  })
  async createGuide(@Body() payload: any) {
    return this.pkkService.createGuidePakke(payload);
  }
}
