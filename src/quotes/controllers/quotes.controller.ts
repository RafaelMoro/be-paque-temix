import { Body, Controller, Post } from '@nestjs/common';
import { QuotesService } from '../services/quotes.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetQuoteResponseDto } from '../dtos/quotes-responses.dto';
import { GetQuoteDto } from '../dtos/quotes.dto';

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
