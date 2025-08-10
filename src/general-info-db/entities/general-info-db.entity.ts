import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class GeneralInfoDb extends Document {
  @Prop({ required: true })
  mnTk: string;
}

export interface GeneralInfoDbDoc extends GeneralInfoDb {
  _id: unknown;
}

export const GeneralInfoDbSchema = SchemaFactory.createForClass(GeneralInfoDb);
