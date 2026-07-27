import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Roles } from '@/auth/decorators/roles/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles/roles.guard';
import { BalanceCaller } from '../balance.interface';
import {
  CreateBalanceRequestDto,
  DecideBalanceRequestDto,
  GetAdminBalanceRequestsQueryDto,
  GetBalanceRequestsQueryDto,
} from '../dtos/balance.dto';
import {
  AdminBalanceRequestResponseDto,
  BalanceRequestResponseDto,
  BalanceResponseDto,
  PaginatedAdminBalanceRequestsResponseDto,
  PaginatedBalanceRequestsResponseDto,
} from '../dtos/balance-responses.dto';
import { BalanceService } from '../services/balance.service';

@ApiTags('Balance')
@UseGuards(JwtGuard)
@Controller('balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a balance request' })
  @ApiResponse({ status: 201, type: BalanceRequestResponseDto })
  async createRequest(
    @Body() dto: CreateBalanceRequestDto,
    @Request() req: ExpressRequest,
  ): Promise<BalanceRequestResponseDto> {
    return this.balanceService.createRequest(
      req.user as BalanceCaller | undefined,
      dto,
    );
  }

  @Get('requests/admin')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List balance requests with admin scope' })
  @ApiResponse({ status: 200, type: PaginatedAdminBalanceRequestsResponseDto })
  async getAdminRequests(
    @Query() query: GetAdminBalanceRequestsQueryDto,
    @Request() req: ExpressRequest,
  ): Promise<PaginatedAdminBalanceRequestsResponseDto> {
    return this.balanceService.getAllRequests(
      req.user as BalanceCaller | undefined,
      query,
    );
  }

  @Get('requests/admin/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one balance request with admin scope' })
  @ApiResponse({ status: 200, type: AdminBalanceRequestResponseDto })
  async getAdminRequestById(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ): Promise<AdminBalanceRequestResponseDto> {
    return this.balanceService.getRequestByIdAdmin(
      req.user as BalanceCaller | undefined,
      id,
    );
  }

  @Get('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List authenticated user balance requests' })
  @ApiResponse({ status: 200, type: PaginatedBalanceRequestsResponseDto })
  async getRequests(
    @Query() query: GetBalanceRequestsQueryDto,
    @Request() req: ExpressRequest,
  ): Promise<PaginatedBalanceRequestsResponseDto> {
    return this.balanceService.getRequestsByUser(
      req.user as BalanceCaller | undefined,
      query,
    );
  }

  @Patch('requests/:id/decision')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or reject a balance request' })
  @ApiResponse({ status: 200, type: AdminBalanceRequestResponseDto })
  async decideRequest(
    @Param('id') id: string,
    @Body() dto: DecideBalanceRequestDto,
    @Request() req: ExpressRequest,
  ): Promise<AdminBalanceRequestResponseDto> {
    return this.balanceService.decideRequest(
      id,
      req.user as BalanceCaller | undefined,
      dto,
    );
  }

  @Patch('requests/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel an authenticated user pending request' })
  @ApiResponse({ status: 200, type: BalanceRequestResponseDto })
  async cancelRequest(
    @Param('id') id: string,
    @Request() req: ExpressRequest,
  ): Promise<BalanceRequestResponseDto> {
    return this.balanceService.cancelRequest(
      id,
      req.user as BalanceCaller | undefined,
    );
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user balance' })
  @ApiResponse({ status: 200, type: BalanceResponseDto })
  async getBalance(
    @Request() req: ExpressRequest,
  ): Promise<BalanceResponseDto> {
    return this.balanceService.getBalance(
      req.user as BalanceCaller | undefined,
    );
  }
}
