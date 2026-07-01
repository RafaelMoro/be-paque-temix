import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'kraftid_counters' })
export class KraftIdCounter extends Document {
  @Prop({ required: true, unique: true })
  yearMonth: string;

  @Prop({ required: true, default: 0 })
  sequence: number;

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop({ default: () => new Date() })
  updatedAt: Date;
}

export const KraftIdCounterSchema =
  SchemaFactory.createForClass(KraftIdCounter);

// ponytail: @Prop unique on yearMonth already creates the index
