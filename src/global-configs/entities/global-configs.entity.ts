import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TypeProfitMargin } from '../global-configs.interface';

export class ProfitMargin {
  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  type: TypeProfitMargin;
}

export class Courier {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: ProfitMargin })
  profitMargin: ProfitMargin;
}

export class Provider {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: [Courier] })
  couriers: Courier[];
}

@Schema()
export class GlobalConfigs extends Document {
  @Prop({ default: 'global', unique: true })
  configId: string;

  @Prop({ required: true, type: [Provider] })
  providers: Provider[];
}

export interface GlobalConfigsDoc extends GlobalConfigs {
  _id: unknown;
}

export const GlobalConfigsSchema = SchemaFactory.createForClass(GlobalConfigs);
