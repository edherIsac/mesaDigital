import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  CONFIRMED = 'CONFIRMED',
  EDITING = 'EDITING',
  DONE = 'DONE',
  EXPIRED = 'EXPIRED',
}

@Schema()
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Studio', required: true, index: true })
  studioId: Types.ObjectId;

  @Prop()
  clientName: string;

  @Prop()
  clientEmail: string;

  @Prop({ required: true, unique: true, index: true })
  accessToken: string;

  @Prop({ type: Types.ObjectId, ref: 'Package', required: true })
  packageId: Types.ObjectId;

  @Prop({ required: true })
  maxPhotosAllowed: number;

  @Prop({ type: String, enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
