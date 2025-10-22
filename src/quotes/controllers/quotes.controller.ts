import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { QuotesService } from '../services/quotes.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetQuoteResponseDto } from '../dtos/quotes-responses.dto';
import { CreateAddressDto, GetQuoteDto } from '../dtos/quotes.dto';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';
import { GetAddressInfoResponseDto } from '@/guia-envia/dtos/guia-envia.responses.dto';

@UseGuards(JwtGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a quote.',
  })
  @ApiResponse({
    status: 201,
    type: GetQuoteResponseDto,
    description: 'Quote retrieved successfully.',
  })
  async getQuote(@Body() payload: GetQuoteDto) {
    return this.quotesService.getQuote(payload);
  }

  @Get('address-info/:zipcode')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get address information.',
  })
  @ApiResponse({
    status: 200,
    type: GetAddressInfoResponseDto,
    description: 'Address information retrieved successfully.',
  })
  async getAddressInfo(@Param('zipcode') zipcode: string) {
    return this.quotesService.getAddressInfo({ zipcode });
  }

  @Post('create-address')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new address.',
  })
  async createAddress(@Body() payload: CreateAddressDto) {
    return this.quotesService.createAddress(payload);
  }
}
