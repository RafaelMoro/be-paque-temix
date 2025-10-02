import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class ProviderConfig {
  @Prop({ required: true })
  tkProd: string;

  @Prop({ required: true })
  tkDev: string;
}

@Schema()
export class GeneralInfoDb extends Document {
  @Prop({ default: 'global', unique: true })
  configId: string;

  @Prop({ required: true, type: ProviderConfig })
  mnConfig: ProviderConfig;

  @Prop({ required: true, type: ProviderConfig })
  toneConfig: ProviderConfig;
}

export interface GeneralInfoDbDoc extends GeneralInfoDb {
  _id: unknown;
}

export const GeneralInfoDbSchema = SchemaFactory.createForClass(GeneralInfoDb);
