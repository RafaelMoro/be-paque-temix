import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Example, ExampleDoc } from './example.entity';
import { CreateVideogameDto } from './example.dto';
import { GuiaEnviaService } from './guia-envia/services/guia-envia.service';
import { GetQuoteGEDto } from './guia-envia/dtos/guia-envia.dtos';
import { T1Service } from './t1/services/t1.service';
import { PakkeService } from './pakke/services/pakke.service';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Example.name) private exampleModel: Model<Example>,
    private guiaEnviaService: GuiaEnviaService,
    private t1Service: T1Service,
    private pakkeService: PakkeService,
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

  async getQuote() {
    try {
      // TODO: Change this dynamically. Wait on what info the others APIs need to get a quote
      const tempData: GetQuoteGEDto = {
        origen: '72000',
        destino: '94298',
        peso: '5.0',
        largo: '30',
        alto: '20',
        ancho: '20',
      };
      const [geQuotes, t1Quotes, pakkeQuotes] = await Promise.allSettled([
        this.guiaEnviaService.getQuote(tempData),
        this.t1Service.getQuote(tempData),
        this.pakkeService.getQuotePakke(tempData),
      ]);

      const geQuotesData =
        geQuotes.status === 'fulfilled' ? geQuotes.value : [];
      const t1QuotesData =
        t1Quotes.status === 'fulfilled' ? t1Quotes.value : [];
      const pakkeQuotesData =
        pakkeQuotes.status === 'fulfilled' ? pakkeQuotes.value : [];

      return {
        quotes: [...geQuotesData, ...t1QuotesData, ...pakkeQuotesData],
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
