process.loadEnvFile('.env.local');

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
  const preferredPorts = [
    process.env.PORT ? Number(process.env.PORT) : 6006,
    3000,
    6007,
    6008,
    6009,
    6010,
  ];
  let server;
  for (const p of preferredPorts) {
    try {
      server = await app.listen(p);
      break;
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'EADDRINUSE') throw e;
      console.warn(`Port ${p} in use, trying next...`);
    }
  }
  if (!server) {
    console.warn('All preferred ports in use, falling back to dynamic port...');
    server = await app.listen(0);
  }
  console.log(`Application listening on port ${server.address().port}`);
}
bootstrap();
