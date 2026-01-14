import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { GuiaEnviaService } from '../services/guia-envia.service';
import { CreateGuideGeDto } from '../dtos/guia-envia.dtos';
import {
  CreateGuideGEResponseDto,
  GetCourierServicesResponseDto,
  GetAliasesGEResponseDto,
  DeleteAddressGEResponseDto,
} from '../dtos/guia-envia.responses.dto';

@UseGuards(JwtGuard)
@Controller('ge')
export class GuiaEnviaController {
  constructor(private readonly guiaEnviaService: GuiaEnviaService) {}

  @Get('courier-services')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a list of courier services.',
  })
  @ApiResponse({
    status: 200,
    type: GetCourierServicesResponseDto,
    description: 'Courier services retrieved successfully.',
  })
  async getCourierServices() {
    return this.guiaEnviaService.listServicesGe();
  }

  @Get('alias-addresses')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a list of aliases of the adresses saved in GE.',
  })
  @ApiResponse({
    status: 200,
    type: GetAliasesGEResponseDto,
    description: 'Address aliases retrieved successfully.',
  })
  async getAddressesSavedGe(@Query('page') page?: string) {
    return this.guiaEnviaService.getAddressesSavedGe(page);
  }

  @Delete('address/:alias')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an address by alias from GE.',
  })
  @ApiResponse({
    status: 200,
    type: DeleteAddressGEResponseDto,
    description: 'Address deleted successfully.',
  })
  async deleteGEAddress(@Param('alias') alias: string) {
    return this.guiaEnviaService.deleteGEAddress(alias);
  }

  @Post('create-guide')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new guide.',
  })
  @ApiResponse({
    status: 201,
    type: CreateGuideGEResponseDto,
    description: 'Guide created successfully.',
  })
  async createGuide(@Body() payload: CreateGuideGeDto) {
    return this.guiaEnviaService.createGuideGe(payload);
  }
}
