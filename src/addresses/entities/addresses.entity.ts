import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class AddressDoc extends Document {
  @Prop({ required: true })
  addressName: string;

  @Prop({ required: true })
  externalNumber: string;

  @Prop()
  internalNumber: string;

  @Prop()
  reference: string;

  @Prop({ required: true })
  zipcode: string;

  @Prop({ required: true })
  neighborhood: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string[];

  @Prop({ required: true })
  town: string[];

  @Prop({ required: true })
  alias: string;

  @Prop({ required: true })
  email: string;
}

export const AddressSchema = SchemaFactory.createForClass(AddressDoc);
