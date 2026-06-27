import { HttpException, HttpStatus } from '@nestjs/common';

export class KraftError extends HttpException {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly technicalDetails?: unknown,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code,
        message: userMessage,
        technicalDetails,
        statusCode: status,
      },
      status,
    );
    this.name = 'KraftError';
  }
}
