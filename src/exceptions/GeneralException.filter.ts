import { VERSION_RESPONSE } from '@/app.constant';
import { GeneralResponse } from '@/global.interface';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { KraftError } from '@/guides/kraft-error';

@Catch(HttpException)
export class GeneralAppExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof KraftError) {
      const errorResponse: GeneralResponse = {
        version: VERSION_RESPONSE ?? 'v1.0.0',
        data: null,
        message: null,
        error: {
          code: exception.code,
          message: exception.userMessage,
          technicalDetails: exception.technicalDetails,
        },
      };
      response.status(exception.getStatus()).send(errorResponse);
      return;
    }

    const errorResponse: GeneralResponse = {
      version: VERSION_RESPONSE ?? 'v1.0.0',
      data: null,
      message: null,
      error: exception.getResponse(),
    };

    response.status(exception.getStatus()).send(errorResponse);
  }
}
