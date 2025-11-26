import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Address extends Document {
  @Prop({ required: true })
  addressName: string;

  @Prop({ required: true })
  externalNumber: string;

  @Prop()
  internalNumber: string;

  @Prop()
  reference: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string[];

  @Prop({ required: true })
  town: string[];

  @Prop({ required: true })
  alias: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
