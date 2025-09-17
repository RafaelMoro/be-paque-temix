import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { QuotesService } from '../services/quotes.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetQuoteResponseDto } from '../dtos/quotes-responses.dto';
import { GetQuoteDto } from '../dtos/quotes.dto';
import { JwtGuard } from '@/auth/guards/jwt-guard/jwt-guard.guard';

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
}
