import mongoose, { Document, Schema } from 'mongoose';

export enum MessageType {
  SMS = 'sms',
  EMAIL = 'email'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered'
}

export interface IRecipient {
  phoneNumber?: string;
  email?: string;
  name?: string;
  status: MessageStatus;
  messageId?: string;
  error?: string;
}

export interface IMessage extends Document {
  userId: mongoose.Types.ObjectId;
  type: MessageType;
  content: string;
  subject?: string;
  recipients: IRecipient[];
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
  status: MessageStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  cost: number;
}

const RecipientSchema: Schema = new Schema({
  phoneNumber: String,
  email: String,
  name: String,
  status: {
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.PENDING
  },
  messageId: String,
  error: String
});

const MessageSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(MessageType),
      required: true
    },
    content: {
      type: String,
      required: true
    },
    subject: {
      type: String
    },
    recipients: [RecipientSchema],
    totalRecipients: {
      type: Number,
      default: 0
    },
    successfulSends: {
      type: Number,
      default: 0
    },
    failedSends: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      default: MessageStatus.PENDING
    },
    scheduledFor: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    cost: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IMessage>('Message', MessageSchema);