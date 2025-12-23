import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  phoneNumber?: string;
  isVerified: boolean;
  credits: number;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    avatar: String,
    phoneNumber: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    credits: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

//
// ✅ FIXED pre-save hook (NO next)
//
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

//
// Compare password method
//
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
