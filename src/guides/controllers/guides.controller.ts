import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { GuidesService } from '../services/guides.service';

@UseGuards(JwtGuard)
@Controller('guides')
export class GuidesController {
  constructor(private guidesService: GuidesService) {}

  @Get()
  async getGuides() {
    return this.guidesService.getGuides();
  }
}
