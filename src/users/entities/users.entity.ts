import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../users.interface';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  role: Role[];

  @Prop({ required: true })
  phone: string;

  @Prop()
  secondPhone: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop()
  companyName: string;

  @Prop()
  address: string;

  @Prop()
  oneTimeToken: string;
}

export interface UserDoc extends User {
  _id: unknown;
}

export const UsersSchema = SchemaFactory.createForClass(User);
