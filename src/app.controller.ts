import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateVideogameDto } from './example.dto';
import { GetQuoteDto } from './app.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getExamples() {
    return this.appService.findExamples();
  }

  @Post('/quote')
  async getQuote(@Body() payload: GetQuoteDto) {
    return this.appService.getQuote(payload);
  }

  @Post()
  async createExample(@Body() payload: CreateVideogameDto) {
    return this.appService.createExample(payload);
  }
}
