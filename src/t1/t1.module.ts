import { Module } from '@nestjs/common';
import { T1Service } from './services/t1.service';
import { T1Controller } from './controllers/t1.controller';

@Module({
  providers: [T1Service],
  exports: [T1Service],
  controllers: [T1Controller],
})
export class T1Module {}
