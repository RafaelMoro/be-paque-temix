import 'reflect-metadata';
import { configure as serverlessExpress } from '@codegenie/serverless-express';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './src/app.module';
import { GeneralAppExceptionFilter } from '@/exceptions/GeneralException.filter';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VERSION_RESPONSE } from '@/app.constant';

let cachedServer: Handler;
const frontendUri = process.env.FRONTEND_URI;
const testFrontendUri = process.env.TEST_FRONTEND_URI;
const domainUri = process.env.DOMAIN_URI;

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
    .setTitle('Kraft envios API')
    .setDescription('This API is connected to mongoDB and uses and REST')
    .setVersion(VERSION_RESPONSE ?? '1.0.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GeneralAppExceptionFilter());
  app.enableCors({
    origin: [frontendUri, testFrontendUri, domainUri],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

type EventPayload = {
  [key: string]: any;
};

export const handler = async (
  event: EventPayload,
  context: Context,
  callback: Callback,
) => {
  if (event.path === '' || event.path === undefined) event.path = '/';

  cachedServer = cachedServer ?? (await bootstrap());
  return cachedServer(event, context, callback);
};
