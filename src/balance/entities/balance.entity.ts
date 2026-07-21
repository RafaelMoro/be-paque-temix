import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { MAX_SAFE_MONEY_CENTS } from '../balance.constants';

@Schema({ timestamps: true, collection: 'balances' })
export class Balance {
  @Prop({ required: true, unique: true, index: true })
  userEmail: string;

  @Prop({
    required: true,
    default: 0,
    min: 0,
    max: MAX_SAFE_MONEY_CENTS,
    validate: Number.isSafeInteger,
  })
  amountInCents: number;

  createdAt: Date;
  updatedAt: Date;
}

export type BalanceDoc = Balance;

export const BalanceSchema = SchemaFactory.createForClass(Balance);
