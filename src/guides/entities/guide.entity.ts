import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
class Address {
  @Prop() alias?: string;
  @Prop() name?: string;
  @Prop() lastName?: string;
  @Prop() phone?: string;
  @Prop() email?: string;
  @Prop() company?: string;
  @Prop() street1?: string;
  @Prop() street2?: string;
  @Prop() isResidential?: boolean;
  @Prop() external_number?: string;
  @Prop() neighborhood?: string;
  @Prop() city?: string;
  @Prop() town?: string;
  @Prop() state?: string;
  @Prop() zipcode?: string;
  @Prop() country?: string;
  @Prop() reference?: string;
}

@Schema({ _id: false })
class Parcel {
  @Prop({ type: Number }) length?: number;
  @Prop({ type: Number }) width?: number;
  @Prop({ type: Number }) height?: number;
  @Prop({ type: Number }) weight?: number;
  @Prop() content?: string;
  @Prop() satProductId?: string;
  @Prop() value?: number;
  @Prop() quantity?: number;
}

@Schema({ _id: false })
class QuoteSnapshot {
  @Prop({ required: true }) id: string | number;
  @Prop() service?: string;
  @Prop() total?: number;
  @Prop() qBaseRef?: number;
  @Prop() qAdjFactor?: number;
  @Prop() qAdjBasis?: number;
  @Prop() qAdjMode?: 'P' | 'A';
  @Prop() qAdjSrcRef?: 'default' | 'custom';
  @Prop() typeService?: 'standard' | 'nextDay' | null;
  @Prop() courier?: string | null;
}

@Schema({ _id: false })
class QuoteData {
  @Prop({ type: QuoteSnapshot }) quote?: QuoteSnapshot;
}

@Schema({ _id: false })
class RetryAttempt {
  @Prop({ required: true }) attemptNumber: number;
  @Prop({ required: true }) timestamp: Date;
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' }) userId: Types.ObjectId;
  @Prop({ required: true }) error: string;
  @Prop({ required: true }) errorCode: string;
}

@Schema({ _id: false })
class Retries {
  @Prop({ type: [RetryAttempt], default: [] }) retryAttempts: RetryAttempt[];
  @Prop({ default: 0, min: 0, max: 10 }) retryCount: number;
  @Prop() lastRetryAt?: Date;
}

@Schema({ _id: false })
class Comment {
  @Prop({ required: true }) text: string;
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' }) adminId: Types.ObjectId;
  @Prop({ required: true, default: () => new Date() }) timestamp: Date;
}

@Schema({
  timestamps: true,
  collection: 'guides',
})
export class Guide extends Document {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  kraftId: string;

  @Prop({ sparse: true, index: true })
  externalId?: string;

  @Prop({ default: false })
  isProviderTrackingSynced: boolean;

  @Prop({ required: true, enum: ['GE', 'TONE', 'Pkk', 'Mn'], index: true })
  provider: string;

  @Prop({
    required: true,
    enum: [
      'created',
      'failed',
      'waiting',
      'in-transit',
      'on-delivery',
      'delivered',
      'returned',
      'exception',
    ],
    default: 'failed',
    index: true,
  })
  status: string;

  @Prop({ required: true, type: Address })
  origin: Address;

  @Prop({ required: true, type: Address })
  destination: Address;

  @Prop({ required: true, type: Parcel })
  parcel: Parcel;

  @Prop({ required: true, type: QuoteData })
  quoteData: QuoteData;

  @Prop({ type: String }) providerStatus?: string | null;
  @Prop() labelUrl?: string;

  @Prop({ type: [String], default: [] })
  oldExternalIds: string[];

  @Prop({ type: Object })
  failureInfo?: {
    errorDetails: string;
    errorCode: string;
    providerResponse: Record<string, unknown>;
    timestamp: Date;
  } | null;

  @Prop({ type: Retries, default: () => ({}) })
  retries: Retries;

  @Prop({ type: [Comment], default: [] })
  comments: Comment[];

  @Prop() lastSyncTimestamp?: Date;
  @Prop() deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type GuideDoc = Guide;

export const GuideSchema = SchemaFactory.createForClass(Guide);

GuideSchema.index({ userId: 1, status: 1 });
GuideSchema.index({ userId: 1, createdAt: -1 });
GuideSchema.index({ userId: 1, provider: 1 });
// ponytail: @Prop unique/index on kraftId/externalId already creates indexes
GuideSchema.index({ createdAt: -1 });
GuideSchema.index({ deletedAt: 1 });
