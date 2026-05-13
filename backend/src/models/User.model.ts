import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  profilePicture?: string;
  authProvider: 'local' | 'google' | 'guest';
  subscriptionStatus: 'free' | 'premium';
  subscriptionExpiry?: Date;
  createdAt: Date;
  lastLogin: Date;
  refreshToken?: string;
  razorpayCustomerId?: string;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    select: false // Exclude from query results by default
  },
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'guest'],
    default: 'local'
  },
  subscriptionStatus: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiry: {
    type: Date
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  refreshToken: {
    type: String
  },
  razorpayCustomerId: {
    type: String
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);
