import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common/pipes';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { GeneralAppExceptionFilter } from './exceptions/GeneralException.filter';
import { VERSION_RESPONSE } from './app.constant';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Kraft envios API')
    .setDescription('This API is connected to mongoDB and uses and REST')
    .setVersion(VERSION_RESPONSE ?? '1.0.0')
    .addTag('videogames')
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
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
