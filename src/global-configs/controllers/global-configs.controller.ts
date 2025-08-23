import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GlobalConfigsService } from '../services/global-configs.service';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import { CreateGlobalConfigsDto } from '../dtos/global-configs.dto';

@Controller('global-configs')
export class GlobalConfigsController {
  constructor(private readonly globalConfigsService: GlobalConfigsService) {}

  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Get()
  async getProfitMargin() {
    return this.globalConfigsService.getProfitMargin();
  }

  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Post()
  async manageProfitMargin(@Body() payload: CreateGlobalConfigsDto) {
    return this.globalConfigsService.manageProfitMargin(payload);
  }
}
