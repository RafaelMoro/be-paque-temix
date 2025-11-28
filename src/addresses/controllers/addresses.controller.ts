import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';

import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { AddressesService } from '../services/addresses.service';
import {
  CreateAddressDtoPayload,
  UpdateAddressDto,
} from '../dtos/addresses.dto';
import {
  CreateAddressResponseDto,
  GetAddressesResponseDto,
} from '../dtos/addresses-response.dto';

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
  @ApiOperation({
    summary: 'Get all addresses for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    type: GetAddressesResponseDto,
    description: 'Addresses retrieved successfully.',
  })
  getAddresses(@Request() req: ExpressRequest) {
    const email = req.user?.email as string;
    return this.addressesService.findAddressesByEmail(email);
  }

  @Delete(':alias')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an address by alias for the authenticated user.',
  })
  deleteAddress(@Param('alias') alias: string, @Request() req: ExpressRequest) {
    const email = req.user?.email as string;
    return this.addressesService.deleteAddressByAliasAndEmail({ alias, email });
  }

  @Put()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update an address by alias for the authenticated user.',
  })
  updateAddress(
    @Body() payload: UpdateAddressDto,
    @Request() req: ExpressRequest,
  ) {
    const email = req.user?.email as string;
    return this.addressesService.updateAddress({ payload, email });
  }
}
