import { Module } from '@nestjs/common';
import { QuotesController } from './controllers/quotes.controller';

@Module({
  controllers: [QuotesController],
})
export class QuotesModule {}
