import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TypeProfitMargin } from '../global-configs.interface';

export class ProfitMargin {
  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  type: TypeProfitMargin;
}

@Schema()
export class GlobalConfigs extends Document {
  @Prop({ required: true, type: ProfitMargin })
  profitMargin: ProfitMargin;
}

export const GlobalConfigsSchema = SchemaFactory.createForClass(GlobalConfigs);
