import mongoose, { Document, Schema } from 'mongoose';

export interface IContact extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  phoneNumber?: string;
  email?: string;
  groups: string[];
  isActive: boolean;
}

const ContactSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    groups: [{
      type: String,
      default: ['All']
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user's contacts
ContactSchema.index({ userId: 1, email: 1 }, { unique: true, sparse: true });
ContactSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model<IContact>('Contact', ContactSchema);