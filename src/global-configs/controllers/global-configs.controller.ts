import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { GlobalConfigsService } from '../services/global-configs.service';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import {
  UpdateGlobalMarginProfitDto,
  UpdateProvidersMarginProfitDto,
} from '../dtos/global-configs.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  GetMarginProfitUnauthorizedErrorDto,
  GetMarginProfitResponseDto,
  GetMarginProfitForbiddenErrorDto,
  GetMarginProfitNotFoundErrorDto,
  UpdateProvidersProfitMarginResponseDto,
  UpdateGlobalProfitMarginResponseDto,
} from '../dtos/global-configs-responses.dto';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

@UseGuards(JwtGuard)
@Controller('global-configs')
export class GlobalConfigsController {
  constructor(private readonly globalConfigsService: GlobalConfigsService) {}

  /**
   * Get the profit margin.
   */
  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Get('profit-margin')
  @ApiOperation({
    summary: 'Get the profit margin',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: GetMarginProfitResponseDto,
    description: 'Profit margin retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    type: GetMarginProfitUnauthorizedErrorDto,
    description: 'Unauthorized. The user has not logged in.',
  })
  @ApiResponse({
    status: 403,
    type: GetMarginProfitForbiddenErrorDto,
    description:
      'The user does not have admin role. Forbidden resource for those users.',
  })
  @ApiResponse({
    status: 404,
    type: GetMarginProfitNotFoundErrorDto,
    description: 'The profit margin was not found.',
  })
  async getProfitMargin() {
    return this.globalConfigsService.getProfitMargin();
  }

  /**
   * Updates the provider's profit margin.
   */
  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Put('profit-margin-providers')
  @ApiOperation({
    summary:
      'Update the profit margin of any courier belonging to any provider',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: UpdateProvidersProfitMarginResponseDto,
    description: 'Profit margin updated successfully.',
  })
  @ApiResponse({
    status: 401,
    type: GetMarginProfitUnauthorizedErrorDto,
    description: 'Unauthorized. The user has not logged in.',
  })
  @ApiResponse({
    status: 403,
    type: GetMarginProfitForbiddenErrorDto,
    description:
      'The user does not have admin role. Forbidden resource for those users.',
  })
  async manageProfitMargin(@Body() payload: UpdateProvidersMarginProfitDto) {
    return this.globalConfigsService.updateProvidersProfitMargin(payload);
  }

  /**
   * Updates the global profit margin.
   */
  @Roles('admin', 'user')
  @UseGuards(RolesGuard)
  @Put('global-profit-margin')
  @ApiOperation({
    summary: 'Update the global profit margin',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    type: UpdateGlobalProfitMarginResponseDto,
    description: 'Profit margin updated successfully.',
  })
  @ApiResponse({
    status: 401,
    type: GetMarginProfitUnauthorizedErrorDto,
    description: 'Unauthorized. The user has not logged in.',
  })
  @ApiResponse({
    status: 403,
    type: GetMarginProfitForbiddenErrorDto,
    description:
      'The user does not have admin role. Forbidden resource for those users.',
  })
  async updateGlobalProfitMargin(@Body() payload: UpdateGlobalMarginProfitDto) {
    return this.globalConfigsService.manageGlobalProfitMargin(payload);
  }
}
