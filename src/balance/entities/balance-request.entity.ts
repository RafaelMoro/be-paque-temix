import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  BALANCE_REQUEST_STATUSES,
  BalanceRequestStatus,
  MAX_SAFE_MONEY_CENTS,
} from '../balance.constants';

@Schema({ timestamps: true, collection: 'balance_requests' })
export class BalanceRequest extends Document {
  @Prop({ required: true, index: true })
  userEmail: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  userLastName: string;

  @Prop({
    required: true,
    min: 1,
    max: MAX_SAFE_MONEY_CENTS,
    immutable: true,
    validate: Number.isSafeInteger,
  })
  amountInCents: number;

  @Prop()
  paymentReference?: string;

  @Prop({
    required: true,
    enum: BALANCE_REQUEST_STATUSES,
    default: 'pending',
    index: true,
  })
  status: BalanceRequestStatus;

  @Prop({ type: String, default: null })
  adminInCharge: string | null;

  @Prop()
  decisionReason?: string;

  @Prop()
  decisionAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type BalanceRequestDoc = BalanceRequest;

export const BalanceRequestSchema =
  SchemaFactory.createForClass(BalanceRequest);

BalanceRequestSchema.index({ userEmail: 1, createdAt: -1 });
BalanceRequestSchema.index({ status: 1, createdAt: -1 });
BalanceRequestSchema.index({ createdAt: -1 });
