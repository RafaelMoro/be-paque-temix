import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Example, ExampleDoc } from './example.entity';
import { CreateVideogameDto } from './example.dto';
import { GuiaEnviaService } from './guia-envia/services/guia-envia.service';
import { T1Service } from './t1/services/t1.service';
import { PakkeService } from './pakke/services/pakke.service';
import { GeneralInfoDbService } from './general-info-db/services/general-info-db.service';
import { ManuableService } from './manuable/services/manuable.service';
import { GetQuoteDto } from './app.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Example.name) private exampleModel: Model<Example>,
    private guiaEnviaService: GuiaEnviaService,
    private t1Service: T1Service,
    private pakkeService: PakkeService,
    private manuableService: ManuableService,
    private generalInfoDbService: GeneralInfoDbService,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async findExamples(): Promise<ExampleDoc[]> {
    try {
      const examples: ExampleDoc[] = await this.exampleModel.find().exec();
      if (!examples) {
        return [];
      }
      return examples;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createExample(data: CreateVideogameDto): Promise<ExampleDoc> {
    try {
      const model = new this.exampleModel(data);
      const modelSaved: ExampleDoc = await model.save();
      return modelSaved;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async getQuote(payload: GetQuoteDto) {
    try {
      const messages: string[] = [];
      const [geQuotes, t1Quotes, pakkeQuotes, mnRes] = await Promise.allSettled(
        [
          this.guiaEnviaService.getQuote(payload),
          this.t1Service.getQuote(payload),
          this.pakkeService.getQuotePakke(payload),
          this.manuableService.retrieveManuableQuotes(payload),
        ],
      );

      const geQuotesData =
        geQuotes.status === 'fulfilled' ? geQuotes.value : [];
      const t1QuotesData =
        t1Quotes.status === 'fulfilled' ? t1Quotes.value : [];
      const pakkeQuotesData =
        pakkeQuotes.status === 'fulfilled' ? pakkeQuotes.value : [];
      const mnQuotesData =
        mnRes.status === 'fulfilled' ? mnRes.value.quotes : [];

      if (geQuotes.status === 'rejected') {
        messages.push('GE failed to get quotes');
      }
      if (t1Quotes.status === 'rejected') {
        messages.push('T1 failed to get quotes');
      }
      if (pakkeQuotes.status === 'rejected') {
        messages.push('Pkk failed to get quotes');
      }
      if (mnRes.status === 'rejected') {
        messages.push('Mn failed to get quotes');
      }
      if (mnRes.status === 'fulfilled' && mnRes.value?.messages) {
        messages.push(...mnRes.value.messages);
      }

      return {
        messages,
        quotes: [
          ...geQuotesData,
          ...t1QuotesData,
          ...pakkeQuotesData,
          ...mnQuotesData,
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
