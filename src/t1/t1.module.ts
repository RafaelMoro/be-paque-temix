import { Module } from '@nestjs/common';
import { T1Service } from './services/t1.service';

@Module({
  providers: [T1Service],
  exports: [T1Service],
})
export class T1Module {}
