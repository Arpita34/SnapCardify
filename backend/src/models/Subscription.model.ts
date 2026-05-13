import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  razorpayCustomerId: string;
  razorpaySubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

const subscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    required: true
  },
  razorpayCustomerId: {
    type: String,
    required: true
  },
  razorpaySubscriptionId: {
    type: String,
    required: true
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
