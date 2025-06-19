import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Example extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;
}

export interface ExampleDoc extends Example {
  _id: unknown;
}

export const ExampleSchema = SchemaFactory.createForClass(Example);
