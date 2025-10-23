import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GuiaEnviaService } from '../services/guia-envia.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateGuideGeDto } from '../dtos/guia-envia.dtos';

@UseGuards(JwtGuard)
@Controller('ge')
export class GuiaEnviaController {
  constructor(private readonly guiaEnviaService: GuiaEnviaService) {}

  @Get('courier-services')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a list of courier services.',
  })
  async getCourierServices() {
    return this.guiaEnviaService.listServicesGe();
  }

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new guide.',
  })
  async createGuide(@Body() payload: CreateGuideGeDto) {
    return this.guiaEnviaService.createGuideGe(payload);
  }
}
