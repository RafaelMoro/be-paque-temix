import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateVideogameDto } from './example.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getExamples() {
    return this.appService.findExamples();
  }

  @Get('/quote')
  async getQuote() {
    return this.appService.getQuote();
  }

  @Post()
  async createExample(@Body() payload: CreateVideogameDto) {
    return this.appService.createExample(payload);
  }
}
