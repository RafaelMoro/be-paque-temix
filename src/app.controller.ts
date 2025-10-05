import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateGuideMnRequestDto } from './manuable/dtos/manuable.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getExamples() {
    return this.appService.findExamples();
  }

  @Post()
  async createGuide(@Body() payload: CreateGuideMnRequestDto) {
    return this.appService.tempCreateGuide(payload);
  }
}
