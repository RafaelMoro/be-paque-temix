import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { GuiaEnviaService } from '../services/guia-envia.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

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
}
