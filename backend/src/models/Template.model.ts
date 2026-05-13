import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  title: string;
  category: 'birthday' | 'anniversary' | 'festival' | 'general';
  thumbnailUrl: string;
  isPremium: boolean;
  overlayConfig: {
    profilePicture: {
      x: number;
      y: number;
      width: number;
      height: number;
      shape: 'circle' | 'square' | 'rounded';
    };
    nameText: {
      x: number;
      y: number;
      fontSize: number;
      color: string;
    };
  };
  createdAt: Date;
}

const templateSchema = new Schema<ITemplate>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['birthday', 'anniversary', 'festival', 'general'],
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  overlayConfig: {
    profilePicture: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      shape: { type: String, enum: ['circle', 'square', 'rounded'], default: 'circle' }
    },
    nameText: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      fontSize: { type: Number, default: 24 },
      color: { type: String, default: '#ffffff' }
    }
  },
}, {
  timestamps: true
});

export const Template = mongoose.model<ITemplate>('Template', templateSchema);
