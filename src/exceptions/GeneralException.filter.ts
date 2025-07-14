import { VERSION_RESPONSE } from '@/app.constant';
import { GeneralResponse } from '@/global.interface';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class GeneralAppExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const error = exception.getResponse();
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    const responseFormatted: GeneralResponse = {
      version: VERSION_RESPONSE ?? 'v1.0.0',
      data: null,
      message: null,
      error,
    };

    response.status(exception.getStatus()).send(responseFormatted);
  }
}
