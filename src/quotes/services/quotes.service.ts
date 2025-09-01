import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';

import { GuiaEnviaService } from '@/guia-envia/services/guia-envia.service';
import { ManuableService } from '@/manuable/services/manuable.service';
import { PakkeService } from '@/pakke/services/pakke.service';
import { T1Service } from '@/t1/services/t1.service';
import { GetQuoteDto } from '../dtos/quotes.dto';
import { GetQuoteDataResponse } from '../quotes.interface';
import config from '@/config';
import { calculateQuotesValue, orderQuotesByPrice } from '../quotes.utils';
import { GlobalConfigsService } from '@/global-configs/services/global-configs.service';

@Injectable()
export class QuotesService {
  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private guiaEnviaService: GuiaEnviaService,
    private t1Service: T1Service,
    private pakkeService: PakkeService,
    private manuableService: ManuableService,
    private globalConfigsService: GlobalConfigsService,
  ) {}

  async getQuote(payload: GetQuoteDto): Promise<GetQuoteDataResponse> {
    try {
      // Calculate the margin profit
      const config = await this.globalConfigsService.getConfig();
      const messages: string[] = [];

      const [geQuotes, t1Quotes, pakkeQuotes, mnRes] = await Promise.allSettled(
        [
          this.guiaEnviaService.getQuote(payload, config),
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

      const allQuotesInfo = [
        ...geQuotesData,
        ...t1QuotesData,
        ...pakkeQuotesData,
        ...mnQuotesData,
      ];

      const updatedQuotes = calculateQuotesValue(
        allQuotesInfo,
        config,
        messages,
      );

      // Order the quotes by price
      const currentQuotes = orderQuotesByPrice(updatedQuotes);

      const npmVersion: string = this.configService.version!;
      return {
        version: npmVersion,
        message: null,
        messages,
        error: null,
        data: {
          quotes: currentQuotes,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
