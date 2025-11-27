import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { AddressesService } from '../services/addresses.service';
import { CreateAddressDtoPayload } from '../dtos/addresses.dto';
import { CreateAddressResponseDto } from '../dtos/addresses-response.dto';

@UseGuards(JwtGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new address.',
  })
  @ApiResponse({
    status: 201,
    type: CreateAddressResponseDto,
    description: 'Address created successfully.',
  })
  createAddress(
    @Request() req: ExpressRequest,
    @Body() payload: CreateAddressDtoPayload,
  ) {
    const email = req.user?.email as string;
    return this.addressesService.createAddress({ payload, email });
  }

  @Get()
  @ApiBearerAuth()
  getAddresses(@Request() req: ExpressRequest) {
    const email = req.user?.email as string;
    return this.addressesService.findAddressesByEmail(email);
  }
}
