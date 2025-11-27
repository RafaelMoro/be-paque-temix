import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AddressesService } from '../services/addresses.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CreateAddressDtoPayload } from '../dtos/addresses.dto';
import { Request as ExpressRequest } from 'express';

@UseGuards(JwtGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @ApiBearerAuth()
  createAddress(
    @Request() req: ExpressRequest,
    @Body() payload: CreateAddressDtoPayload,
  ) {
    const email = req.user?.email as string;
    return this.addressesService.createAddress({ payload, email });
  }
}
