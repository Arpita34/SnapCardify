# Project Submission

## 1. Folder Structure
```
backend/
  ├── src/
  │   ├── config/       (Database & environment configs)
  │   ├── controllers/  (Core request handling and logic)
  │   ├── middleware/   (Auth and upload guards)
  │   ├── models/       (Mongoose database schemas)
  │   ├── routes/       (API route definitions)
  │   ├── utils/        (Helper functions like JWT generation)
  │   ├── index.ts      (Entry point)
  │   └── server.ts     (Express app configuration)
frontend/
  ├── src/
  │   ├── assets/       (Static images/icons)
  │   ├── components/   (Reusable UI parts like Navbar)
  │   ├── pages/        (Main screens: Home, Login, Editor)
  │   ├── services/     (Axios API setup)
  │   ├── store/        (Zustand state management)
  │   ├── App.tsx       (Main React wrapper)
  │   ├── main.tsx      (React DOM render)
  │   └── index.css     (Tailwind entry & basic styles)
```

## 2. Dependencies
**Backend**:
- express, mongoose, bcryptjs, jsonwebtoken (Standard MERN stack)
- cors, dotenv, multer (Basic utilities)
- typescript, ts-node (Dev)

**Frontend**:
- react, react-dom, react-router-dom (Core UI)
- axios (API requests)
- zustand (State management)
- tailwindcss, postcss, autoprefixer (Styling)

## 3. Full Code File-by-File

### Backend

**backend/src/config/database.ts**
```typescript
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/greetings_app');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

```

**backend/src/config/passport.ts**
```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.model';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: '/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email from Google profile'), undefined);
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          // Update lastLogin
          user.lastLogin = new Date();
          await user.save();
        } else {
          // Create new user from Google profile
          user = await User.create({
            email,
            name: profile.displayName,
            profilePicture: profile.photos?.[0]?.value || '',
            authProvider: 'google',
            subscriptionStatus: 'free',
          });
        }

        // Generate tokens
        const jwtAccessToken = generateAccessToken({ userId: user._id.toString(), email: user.email });
        const jwtRefreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email });

        user.refreshToken = jwtRefreshToken;
        await user.save();

        return done(null, { user, token: jwtAccessToken } as any);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;

```

**backend/src/controllers/auth.controller.ts**
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.model';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.util';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    
    // check if user is already in db
    const foundUser = await User.findOne({ email });
    if (foundUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    
    // Hash password before saving
    const salt = await bcrypt.genSalt(12);
    const hashedPwd = await bcrypt.hash(password, salt);
    
    // Create new user in mongo
    const user = await User.create({
      name,
      email,
      password: hashedPwd,
      authProvider: 'local'
    });
    
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    // TODO: implement email verification later
    user.refreshToken = refreshToken;
    await user.save();
    
    res.status(201).json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // updating last login time
    user.lastLogin = new Date();
    
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id, email: user.email });
    
    user.refreshToken = refreshToken;
    await user.save();
    
    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscriptionStatus: user.subscriptionStatus,
        profilePicture: user.profilePicture
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token is required' });
    }
    
    const user = await User.findOne({ refreshToken: token });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    
    // issue a new access token
    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    res.json({ success: true, token: accessToken });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // or extract from auth middleware if protected
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

```

**backend/src/controllers/subscription.controller.ts**
```typescript
import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { User } from '../models/User.model';
import { Subscription } from '../models/Subscription.model';


export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const { plan } = req.body; // 'monthly' or 'yearly'
    
    // In a real app, these prices would be fetched from DB or env variables
    const amount = plan === 'monthly' ? 9900 : 99900; // in paise (₹99 or ₹999)
    
    const options = {
      amount,
      currency: 'INR',
      // Max 40 characters allowed by Razorpay
      receipt: `rcpt_${req.user?._id?.toString().slice(-6)}_${Date.now()}`,
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({ success: true, order });
  } catch (error: any) {
    console.error('RAZORPAY ERROR:', error);
    res.status(500).json({ success: false, message: error.message || 'Razorpay Error' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');
      
    const isAuthentic = expectedSignature === razorpay_signature;
    
    if (isAuthentic) {
      // Calculate Expiry
      const expiry = new Date();
      if (plan === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
      } else {
        expiry.setMonth(expiry.getMonth() + 1);
      }
      
      // Update User
      await User.findByIdAndUpdate(req.user?._id, {
        subscriptionStatus: 'premium',
        subscriptionExpiry: expiry,
        razorpayCustomerId: razorpay_payment_id // Storing payment ID as a proxy for customer ID for now
      });
      
      // Create Subscription Record
      await Subscription.create({
        userId: req.user?._id,
        plan,
        status: 'active',
        razorpayCustomerId: razorpay_payment_id,
        razorpaySubscriptionId: razorpay_order_id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiry,
      });
      
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

```

**backend/src/controllers/template.controller.ts**
```typescript
import { Request, Response } from 'express';
import { Template } from '../models/Template.model';

export const getTemplates = async (req: Request, res: Response) => {
  try {
    const { category, isPremium, page = 1, limit = 20 } = req.query;
    
    const filter: any = {};
    if (category && category !== 'all') filter.category = category;
    if (isPremium !== undefined) filter.isPremium = isPremium === 'true';
    
    const templates = await Template.find(filter)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ usageCount: -1 });
    
    const total = await Template.countDocuments(filter);
    
    res.json({
      success: true,
      data: templates,
      pagination: {
        page: +page,
        limit: +limit,
        total,
        pages: Math.ceil(total / +limit)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Optional: Only allow premium users to access premium templates' full details
    if (template.isPremium && req.user && req.user.subscriptionStatus !== 'premium') {
       return res.status(403).json({ success: false, message: 'Premium subscription required' });
    }
    
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin routes (basic implementation)
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const template = await Template.create(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

```

**backend/src/controllers/user.controller.ts**
```typescript
import { Request, Response } from 'express';
import { User } from '../models/User.model';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password -refreshToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // Process image: resize, compress, convert to webp
    const processedImage = await sharp(req.file.buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    
    // Upload to Cloudinary via stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'profile-pictures',
        public_id: `user_${req.user?._id}`,
        overwrite: true,
      },
      async (error, result) => {
        if (error || !result) {
          return res.status(500).json({ success: false, message: 'Upload to Cloudinary failed' });
        }
        
        // Update user document
        const updatedUser = await User.findByIdAndUpdate(
          req.user?._id,
          { profilePicture: result.secure_url },
          { new: true }
        ).select('-password -refreshToken');
        
        res.json({ success: true, user: updatedUser });
      }
    );
    
    uploadStream.end(processedImage);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

```

**backend/src/index.ts**
```typescript
// Must load env vars FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now safe to import everything else
import './server';

```

**backend/src/middleware/auth.middleware.ts**
```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { User, IUser } from '../models/User.model';

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
    
    try {
      const decoded = verifyToken(token);
      
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
      
      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

```

**backend/src/middleware/upload.middleware.ts**
```typescript
import multer from 'multer';

// Use memory storage to process image with sharp before uploading to cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

```

**backend/src/models/Subscription.model.ts**
```typescript
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

```

**backend/src/models/Template.model.ts**
```typescript
import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  title: string;
  category: 'birthday' | 'anniversary' | 'festival' | 'general';
  imageUrl: string;
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
      fontFamily: string;
      color: string;
      maxWidth: number;
    };
  };
  tags: string[];
  usageCount: number;
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
  imageUrl: {
    type: String,
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
      fontFamily: { type: String, default: 'Arial' },
      color: { type: String, default: '#000000' },
      maxWidth: { type: Number, required: true }
    }
  },
  tags: [String],
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export const Template = mongoose.model<ITemplate>('Template', templateSchema);

```

**backend/src/models/User.model.ts**
```typescript
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

```

**backend/src/routes/auth.routes.ts**
```typescript
import express from 'express';
import passport from 'passport';
import '../config/passport'; // Initialize Google Strategy
import { register, login, refreshToken, logout } from '../controllers/auth.controller';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed`, session: false }),
  (req: any, res) => {
    const { token } = req.user;
    // Redirect to frontend with token as query param
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

export default router;

```

**backend/src/routes/subscription.routes.ts**
```typescript
import express from 'express';
import { createCheckoutSession, verifyPayment } from '../controllers/subscription.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/create-order', protect, createCheckoutSession);
router.post('/verify', protect, verifyPayment);

export default router;

```

**backend/src/routes/template.routes.ts**
```typescript
import express from 'express';
import { getTemplates, getTemplateById, createTemplate } from '../controllers/template.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/', getTemplates);

// To get template details, user needs to be authenticated to check subscription status
router.get('/:id', protect, getTemplateById);

// Admin only (simplified for now)
router.post('/', protect, createTemplate);

export default router;

```

**backend/src/routes/user.routes.ts**
```typescript
import express from 'express';
import { getProfile, updateProfile, uploadProfilePicture } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

export default router;

```

**backend/src/server.ts**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import templateRoutes from './routes/template.routes';
import subscriptionRoutes from './routes/subscription.routes';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running normally' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

```

**backend/src/utils/jwt.util.ts**
```typescript
import jwt, { SignOptions } from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_min_32_chars_please_change';

export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '15m' };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

```

### Frontend

**frontend/src/App.css**
```css
.counter {
  font-size: 16px;
  padding: 5px 10px;
  border-radius: 5px;
  color: var(--accent);
  background: var(--accent-bg);
  border: 2px solid transparent;
  transition: border-color 0.3s;
  margin-bottom: 24px;

  &:hover {
    border-color: var(--accent-border);
  }
  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.hero {
  position: relative;

  .base,
  .framework,
  .vite {
    inset-inline: 0;
    margin: 0 auto;
  }

  .base {
    width: 170px;
    position: relative;
    z-index: 0;
  }

  .framework,
  .vite {
    position: absolute;
  }

  .framework {
    z-index: 1;
    top: 34px;
    height: 28px;
    transform: perspective(2000px) rotateZ(300deg) rotateX(44deg) rotateY(39deg)
      scale(1.4);
  }

  .vite {
    z-index: 0;
    top: 107px;
    height: 26px;
    width: auto;
    transform: perspective(2000px) rotateZ(300deg) rotateX(40deg) rotateY(39deg)
      scale(0.8);
  }
}

#center {
  display: flex;
  flex-direction: column;
  gap: 25px;
  place-content: center;
  place-items: center;
  flex-grow: 1;

  @media (max-width: 1024px) {
    padding: 32px 20px 24px;
    gap: 18px;
  }
}

#next-steps {
  display: flex;
  border-top: 1px solid var(--border);
  text-align: left;

  & > div {
    flex: 1 1 0;
    padding: 32px;
    @media (max-width: 1024px) {
      padding: 24px 20px;
    }
  }

  .icon {
    margin-bottom: 16px;
    width: 22px;
    height: 22px;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    text-align: center;
  }
}

#docs {
  border-right: 1px solid var(--border);

  @media (max-width: 1024px) {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

#next-steps ul {
  list-style: none;
  padding: 0;
  display: flex;
  gap: 8px;
  margin: 32px 0 0;

  .logo {
    height: 18px;
  }

  a {
    color: var(--text-h);
    font-size: 16px;
    border-radius: 6px;
    background: var(--social-bg);
    display: flex;
    padding: 6px 12px;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: var(--shadow);
    }
    .button-icon {
      height: 18px;
      width: 18px;
    }
  }

  @media (max-width: 1024px) {
    margin-top: 20px;
    flex-wrap: wrap;
    justify-content: center;

    li {
      flex: 1 1 calc(50% - 8px);
    }

    a {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
}

#spacer {
  height: 88px;
  border-top: 1px solid var(--border);
  @media (max-width: 1024px) {
    height: 48px;
  }
}

.ticks {
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: -4.5px;
    border: 5px solid transparent;
  }

  &::before {
    left: 0;
    border-left-color: var(--border);
  }
  &::after {
    right: 0;
    border-right-color: var(--border);
  }
}

```

**frontend/src/App.tsx**
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import EditorPage from './pages/EditorPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { useAuthStore } from './store/useAuthStore';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

```

**frontend/src/components/common/Navbar.tsx**
```typescript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="text-lg font-bold text-gray-900">GreetCraft</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-3 pr-1 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700 hidden sm:block">{user.name.split(' ')[0]}</span>
                {user.subscriptionStatus === 'premium' && (
                  <span className="badge-premium text-xs py-0.5 px-1.5 hidden sm:inline-flex">PRO</span>
                )}
                <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-white text-xs font-bold">{user.name[0]?.toUpperCase()}</span>
                  )}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded shadow-md py-1">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    My Profile
                  </Link>
                  <div className="h-px bg-gray-200 my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full block px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Sign In</Link>
              <Link to="/login" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

```

**frontend/src/components/home/CategoryFilter.tsx**
```typescript
import React from 'react';

const categories = [
  { id: 'all', label: 'All', icon: '🎨' },
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'anniversary', label: 'Anniversary', icon: '💑' },
  { id: 'festival', label: 'Festivals', icon: '🎊' },
  { id: 'general', label: 'General', icon: '✨' },
];

interface Props {
  activeCategory: string;
  onSelect: (id: string) => void;
}

const CategoryFilter: React.FC<Props> = ({ activeCategory, onSelect }) => (
  <div className="flex gap-2 mb-4">
    {categories.map((cat) => (
      <button
        key={cat.id}
        className={`px-3 py-1 rounded-full border ${activeCategory === cat.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
        onClick={() => onSelect(cat.id)}
      >
        <span className="mr-1">{cat.icon}</span>
        {cat.label}
      </button>
    ))}
  </div>
);

export default CategoryFilter;

```

**frontend/src/components/home/PremiumBadge.tsx**
```typescript
import React from 'react';

const PremiumBadge: React.FC = () => (
  <span className="bg-yellow-400 text-xs px-2 py-1 rounded">Premium</span>
);

export default PremiumBadge;

```

**frontend/src/components/home/TemplateCard.tsx**
```typescript
import React from 'react';

interface Template {
  id: string;
  title: string;
  category: string;
  isPremium: boolean;
  thumbnailUrl: string;
  overlayConfig: any;
}

interface Props {
  template: Template;
  onClick: () => void;
}

const TemplateCard: React.FC<Props> = ({ template, onClick }) => (
  <div className="border rounded-lg p-2 shadow hover:shadow-lg cursor-pointer relative" onClick={onClick}>
    <img src={template.thumbnailUrl} alt={template.title} className="w-full h-40 object-cover rounded" />
    <h3 className="mt-2 font-semibold text-lg">{template.title}</h3>
    {template.isPremium && (
      <span className="absolute top-2 right-2 bg-yellow-400 text-xs px-2 py-1 rounded">Premium</span>
    )}
    {/* TODO: Add overlay preview, actions */}
  </div>
);

export default TemplateCard;

```

**frontend/src/components/home/TemplateGrid.tsx**
```typescript
import React from 'react';
import TemplateCard from './TemplateCard';

interface Template {
  id: string;
  title: string;
  category: string;
  isPremium: boolean;
  thumbnailUrl: string;
  overlayConfig: any;
}

interface Props {
  templates: Template[];
  onSelect: (template: Template) => void;
}

const TemplateGrid: React.FC<Props> = ({ templates, onSelect }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {templates.map((template) => (
      <TemplateCard key={template.id} template={template} onClick={() => onSelect(template)} />
    ))}
  </div>
);

export default TemplateGrid;

```

**frontend/src/index.css**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  body {
    font-family: 'Inter', sans-serif;
    background-color: #f8f9fa;
    color: #333333;
    margin: 0;
    min-height: 100vh;
  }
}

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white font-medium px-4 py-2 rounded shadow-sm hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-colors;
  }

  .btn-secondary {
    @apply bg-white text-gray-700 font-medium px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 active:scale-95 transition-colors;
  }

  .glass-card {
    @apply bg-white border border-gray-200 rounded shadow-sm;
  }

  .input-field {
    @apply w-full bg-white border border-gray-300 text-gray-900 rounded px-3 py-2
           placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors;
  }

  .badge-premium {
    @apply inline-flex items-center gap-1 bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide;
  }

  .badge-free {
    @apply inline-flex items-center gap-1 bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide border border-gray-300;
  }
}

```

**frontend/src/main.tsx**
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

**frontend/src/pages/AuthCallbackPage.tsx**
```typescript
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login?error=oauth_failed');
      return;
    }

    // Fetch user profile using the token
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/users/profile')
      .then(({ data }) => {
        setAuth(data.data, token);
        navigate('/');
      })
      .catch(() => {
        navigate('/login?error=oauth_failed');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
      <div className="text-center">
        <div className="inline-flex w-16 h-16 rounded-full bg-violet-600/20 items-center justify-center mb-4">
          <svg className="animate-spin h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">Signing you in...</h2>
        <p className="text-white/40 mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}

```

**frontend/src/pages/EditorPage.tsx**
```typescript
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { useAuthStore } from '../store/useAuthStore';

export default function EditorPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const template = location.state?.template;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [generated, setGenerated] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [customName, setCustomName] = useState(user?.name || '');
  const [customMessage, setCustomMessage] = useState('Wishing you a wonderful day!');
  const [showShare, setShowShare] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profilePicture || null);
  
  // Advanced Editor Controls
  const [photoX, setPhotoX] = useState(template?.overlayConfig?.profilePicture?.x || 35);
  const [photoY, setPhotoY] = useState(template?.overlayConfig?.profilePicture?.y || 20);
  const [photoSize, setPhotoSize] = useState(template?.overlayConfig?.profilePicture?.width || 30);

  // If no template in state, go back
  useEffect(() => {
    if (!template) navigate('/');
  }, [template]);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const renderCanvas = async () => {
    if (!canvasRef.current || !template) return;
    setRendering(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1080;

      // 1. Draw background template
      const bg = await loadImage(template.thumbnailUrl);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

      // 2. Draw user profile picture
      if (photoPreview) {
        const { profilePicture: pc } = template.overlayConfig;
        const photo = await loadImage(photoPreview);
        const x = (photoX / 100) * canvas.width;
        const y = (photoY / 100) * canvas.height;
        const w = (photoSize / 100) * canvas.width;
        // Keep aspect ratio 1:1 for the mask
        const h = w;

        ctx.save();
        ctx.beginPath();
        if (pc.shape === 'circle') {
          ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        } else {
          ctx.roundRect(x, y, w, h, pc.shape === 'rounded' ? 20 : 0);
        }
        ctx.clip();
        ctx.drawImage(photo, x, y, w, h);
        ctx.restore();

        // White border
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Draw name text
      const { nameText } = template.overlayConfig;
      await document.fonts.ready;
      ctx.save();
      ctx.font = `bold ${nameText.fontSize * 2}px Inter, Arial, sans-serif`;
      ctx.fillStyle = nameText.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(
        customName,
        (nameText.x / 100) * canvas.width,
        (nameText.y / 100) * canvas.height
      );
      
      // 4. Draw Custom Message (Write whatever you want)
      ctx.font = `italic 500 ${nameText.fontSize * 1.2}px Inter, Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      
      // Simple multi-line text wrapping logic
      const words = customMessage.split(' ');
      let line = '';
      let msgY = (nameText.y / 100) * canvas.height + 60;
      const maxWidth = canvas.width * 0.8;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, (nameText.x / 100) * canvas.width, msgY);
          line = words[i] + ' ';
          msgY += nameText.fontSize * 1.5;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, (nameText.x / 100) * canvas.width, msgY);
      
      ctx.restore();

      setGenerated(canvas.toDataURL('image/png', 1.0));
    } catch (err) {
      console.error('Canvas render error:', err);
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    if (template) renderCanvas();
  }, [template, customName, customMessage, photoPreview, photoX, photoY, photoSize]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (!generated) return;
    const link = document.createElement('a');
    link.href = generated;
    link.download = `greeting-${Date.now()}.png`;
    link.click();
  };

  const handleNativeShare = () => {
    setShowShare(!showShare);
  };

  const copyImageToClipboard = async (appName: string = '') => {
    if (!generated) return;
    try {
      const blob = await (await fetch(generated)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      const targetText = appName ? ` into ${appName}` : '';
      alert(`✅ Image copied! You can now paste (Ctrl+V) directly${targetText}.`);
    } catch {
      alert('⚠️ Failed to copy image. Please use Download instead.');
    }
  };

  if (!template) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-6 transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to templates
        </button>

        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* Canvas Preview */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{template.title}</h1>
            <div className="relative rounded overflow-hidden border border-gray-200 aspect-square bg-gray-100">
              <canvas ref={canvasRef} className="hidden" />
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                  <svg className="animate-spin h-8 w-8 text-violet-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
              {generated && (
                <img src={generated} alt="Generated greeting" className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">✏️ Customize</h2>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Your name"
                  className="input-field"
                />
              </div>

              {/* Custom Message */}
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1.5">Custom Message</label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Write whatever you want here..."
                  className="input-field min-h-[80px] resize-y"
                  maxLength={100}
                />
              </div>

              {/* Photo Upload & Advanced Controls */}
              <div className="pt-4 border-t border-gray-100 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm text-gray-800 font-medium">Your Photo</label>
                  {photoPreview && (
                    <button 
                      onClick={() => setPhotoPreview(null)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
                    )}
                  </div>
                  <label className="btn-secondary text-sm cursor-pointer flex-1 text-center">
                    📷 {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>

                {/* Sliders for moving the photo */}
                {photoPreview && (
                  <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-200">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Horizontal Position</span>
                        <span>{photoX}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={photoX} onChange={e => setPhotoX(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Vertical Position</span>
                        <span>{photoY}%</span>
                      </div>
                      <input type="range" min="0" max="100" value={photoY} onChange={e => setPhotoY(Number(e.target.value))} className="w-full" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Size</span>
                        <span>{photoSize}%</span>
                      </div>
                      <input type="range" min="10" max="80" value={photoSize} onChange={e => setPhotoSize(Number(e.target.value))} className="w-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="text-base font-semibold text-gray-900 mb-2">📤 Share</h2>
              <button onClick={handleNativeShare} disabled={!generated || rendering} className="btn-primary w-full py-3">
                🚀 Share Now
              </button>
              <button onClick={handleDownload} disabled={!generated || rendering} className="btn-secondary w-full py-3">
                ⬇️ Download PNG
              </button>
            </div>

            {/* Share Options Panel */}
            {showShare && generated && (
              <div className="glass-card p-5 mt-4">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Share via</h2>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      const text = encodeURIComponent('Check out my personalized greeting! Paste the copied image here!');
                      copyImageToClipboard('WhatsApp').then(() => {
                        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                        if (isMobile) {
                          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                        } else {
                          window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank');
                        }
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded transition-colors text-xs text-green-700"
                  >
                    <span className="text-xl">💬</span>WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent('My Customized Greeting');
                      const body = encodeURIComponent('I created this awesome greeting. Paste the copied image here!');
                      copyImageToClipboard('Gmail').then(() => {
                        window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, '_blank');
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors text-xs text-red-700"
                  >
                    <span className="text-xl">📧</span>Email
                  </button>
                  <button
                    onClick={() => {
                      copyImageToClipboard('Instagram').then(() => {
                        window.open('https://instagram.com/', '_blank');
                      });
                    }}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 rounded transition-colors text-xs text-fuchsia-700"
                  >
                    <span className="text-xl">📸</span>Instagram
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors text-xs text-gray-700"
                  >
                    <span className="text-xl">⬇️</span>Download
                  </button>
                  <button
                    onClick={() => copyImageToClipboard('any app')}
                    className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors text-xs text-blue-700"
                  >
                    <span className="text-xl">📋</span>Copy Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

```

**frontend/src/pages/HomePage.tsx**
```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '✨' },
  { id: 'birthday', label: 'Birthday', icon: '🎂' },
  { id: 'anniversary', label: 'Anniversary', icon: '💑' },
  { id: 'festival', label: 'Festivals', icon: '🎊' },
  { id: 'general', label: 'General', icon: '🌟' },
];

interface Template {
  _id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  isPremium: boolean;
  overlayConfig: any;
}

// Stunning, high-quality Unsplash templates
const MOCK_TEMPLATES: Template[] = [
  { _id: '2', title: 'Golden Anniversary', category: 'anniversary', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 10, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 55, fontSize: 26, color: '#f5c518' } } },
  { _id: '3', title: 'Festival of Lights', category: 'festival', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 26, color: '#ffeb3b' } } },
  { _id: '4', title: 'Minimalist Celebration', category: 'birthday', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 15, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 60, fontSize: 24, color: '#ffffff' } } },
  { _id: '5', title: 'Luxury Sparkle', category: 'anniversary', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 15, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 60, fontSize: 24, color: '#ffffff' } } },
  { _id: '6', title: 'Colorful Holi', category: 'festival', isPremium: false, thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 26, color: '#ffffff' } } },
  { _id: '8', title: 'Premium Night Sky', category: 'general', isPremium: true, thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=800', overlayConfig: { profilePicture: { x: 35, y: 20, width: 30, height: 30, shape: 'circle' }, nameText: { x: 50, y: 65, fontSize: 28, color: '#a855f7' } } },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<Template | null>(null);

  // Fetch real templates from API (works once DB is populated)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const params = activeCategory !== 'all' ? `?category=${activeCategory}` : '';
        const { data } = await api.get(`/templates${params}`);
        if (data.data && data.data.length > 0) {
          setTemplates(data.data);
        } else {
          // Fallback to mock data while DB is empty
          const filtered = activeCategory === 'all'
            ? MOCK_TEMPLATES
            : MOCK_TEMPLATES.filter(t => t.category === activeCategory);
          setTemplates(filtered);
        }
      } catch {
        const filtered = activeCategory === 'all'
          ? MOCK_TEMPLATES
          : MOCK_TEMPLATES.filter(t => t.category === activeCategory);
        setTemplates(filtered);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [activeCategory]);

  const handleTemplateClick = (template: Template) => {
    if (template.isPremium && user?.subscriptionStatus !== 'premium') {
      setSelectedPremiumTemplate(template);
      setShowPremiumModal(true);
      return;
    }
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/editor/${template._id}`, { state: { template } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto">

          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Create Personalized Greetings
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Pick a template, add your photo & name — share a beautiful personalized greeting in seconds.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map(template => (
              <TemplateCard
                key={template._id}
                template={template}
                user={user}
                onClick={() => handleTemplateClick(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Modal */}
      {showPremiumModal && (
        <PremiumModal
          template={selectedPremiumTemplate}
          onClose={() => setShowPremiumModal(false)}
          onUpgrade={() => navigate('/profile')}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function TemplateCard({ template, user, onClick }: { template: Template; user: any; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative group cursor-pointer rounded overflow-hidden border border-gray-200 bg-white hover:shadow-md transition-shadow"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-square relative overflow-hidden bg-black/40">
        <img
          src={template.thumbnailUrl}
          alt={template.title}
          className="w-full h-full object-cover"
        />



        {/* User Photo Overlay Simulation */}
        {user && (
          <div
            className="absolute rounded-full border-2 border-white shadow-lg overflow-hidden transition-all duration-300"
            style={{
              left: `${template.overlayConfig.profilePicture.x}%`,
              top: `${template.overlayConfig.profilePicture.y}%`,
              width: `${template.overlayConfig.profilePicture.width}%`,
              height: `${template.overlayConfig.profilePicture.height}%`,
            }}
          >
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {user.name[0]?.toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Name Overlay Simulation */}
        {user && (
          <p
            className="absolute font-bold text-shadow transition-all duration-300"
            style={{
              left: `${template.overlayConfig.nameText.x}%`,
              top: `${template.overlayConfig.nameText.y}%`,
              color: template.overlayConfig.nameText.color,
              fontSize: '14px',
              transform: 'translateX(-50%)',
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          >
            {user.name}
          </p>
        )}

        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded">
            {template.isPremium && user?.subscriptionStatus !== 'premium' ? '🔒 Unlock Pro' : 'Use Template'}
          </span>
        </div>
      </div>

      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-800 font-medium truncate pr-2">{template.title}</p>
            <p className="text-xs text-gray-500 uppercase mt-0.5">{template.category}</p>
          </div>
          {template.isPremium ? (
            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded">
              PRO
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded border border-gray-200">
              Free
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PremiumModal({ template, onClose, onUpgrade }: { template: Template | null; onClose: () => void; onUpgrade: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Premium Template</h2>
          <p className="text-gray-600 text-sm">
            "{template?.title}" is a premium template.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="card p-4 text-center border border-gray-200">
            <p className="text-xl font-bold text-gray-900">₹99</p>
            <p className="text-gray-500 text-xs">/ month</p>
            <button onClick={onUpgrade} className="btn-primary w-full mt-3 text-sm py-2">Monthly</button>
          </div>
          <div className="card p-4 text-center border border-blue-500 relative">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-1 text-xs font-bold rounded">SAVE</span>
            <p className="text-xl font-bold text-gray-900">₹999</p>
            <p className="text-gray-500 text-xs">/ year</p>
            <button onClick={onUpgrade} className="btn-primary w-full mt-3 text-sm py-2">Yearly</button>
          </div>
        </div>

        <button onClick={onClose} className="w-full text-gray-500 hover:text-gray-800 text-sm transition-colors">
          Maybe later
        </button>
      </div>
    </div>
  );
}

```

**frontend/src/pages/LoginPage.tsx**
```typescript
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');
  const { setAuth } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const { data } = await api.post(endpoint, payload);
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-xl text-white font-bold">
              G
            </div>
            <span className="text-2xl font-bold text-gray-900">GreetCraft</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to access your greeting templates' : 'Start creating beautiful greetings'}
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 bg-white border border-gray-200 rounded shadow-sm">
          {/* OAuth Error */}
          {oauthError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              Google sign-in failed. Please try again.
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-100 transition-all duration-200 mb-6 active:scale-95"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required={!isLogin}
                  className="input-field"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="input-field"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

```

**frontend/src/pages/ProfilePage.tsx**
```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || '');

  // Razorpay subscription
  const [payLoading, setPayLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/users/profile', { name });
      updateUser({ name: data.data.name });
      showSuccess('Name updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const { data } = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profilePicture: data.user.profilePicture });
      showSuccess('Profile picture updated!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setPayLoading(true);
    setError('');
    try {
      const { data } = await api.post('/subscriptions/create-order', { plan });
      const order = data.order;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'GreetCraft Premium',
        description: `${plan === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.post('/subscriptions/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            });
            updateUser({ subscriptionStatus: 'premium' });
            showSuccess('🎉 Welcome to Premium!');
          } catch {
            setError('Payment verification failed. Contact support.');
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#7c3aed' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate payment');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-8 transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to home
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Profile Picture */}
        <div className="card p-6 mb-5 bg-white border border-gray-200 rounded shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">📸 Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <label className="btn-primary text-sm cursor-pointer">
                {uploading ? 'Uploading...' : '📷 Change Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
              <p className="text-gray-500 text-xs mt-2">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="card p-6 mb-5 bg-white border border-gray-200 rounded shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">✏️ Display Name</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="input-field flex-1"
            />
            <button onClick={handleUpdateName} disabled={saving || name === user?.name} className="btn-primary px-5">
              {saving ? '...' : 'Save'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">{user?.email}</p>
        </div>

        {/* Subscription */}
        <div className="card p-6 bg-white border border-gray-200 rounded shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">👑 Subscription</h2>
            {user?.subscriptionStatus === 'premium' ? (
              <span className="badge-premium">PREMIUM ACTIVE</span>
            ) : (
              <span className="badge-free">FREE PLAN</span>
            )}
          </div>

          {user?.subscriptionStatus === 'premium' ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-blue-800 font-medium">🎉 You have full access to all premium templates!</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-5">Unlock all premium templates, no watermarks, priority support.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 text-center border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly</p>
                  <p className="text-3xl font-bold text-gray-900">₹99</p>
                  <p className="text-gray-500 text-xs mb-4">/month</p>
                  <button onClick={() => handleSubscribe('monthly')} disabled={payLoading} className="btn-primary w-full text-sm py-2">
                    {payLoading ? '...' : 'Subscribe'}
                  </button>
                </div>
                <div className="card p-4 text-center border border-blue-500 relative bg-white">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold rounded uppercase">BEST VALUE</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Yearly</p>
                  <p className="text-3xl font-bold text-gray-900">₹999</p>
                  <p className="text-gray-500 text-xs mb-4">/year</p>
                  <button onClick={() => handleSubscribe('yearly')} disabled={payLoading} className="btn-primary w-full text-sm py-2">
                    {payLoading ? '...' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

```

**frontend/src/pages/SubscriptionPage.tsx**
```typescript
import React from 'react';

const SubscriptionPage: React.FC = () => {
  return (
    <div>
      <h1>Subscription Page</h1>
      {/* TODO: Add subscription plans, payment, status */}
    </div>
  );
};

export default SubscriptionPage;

```

**frontend/src/routes.tsx**
```typescript
// This file is no longer needed — routing is handled in App.tsx
export {};

```

**frontend/src/services/api.ts**
```typescript
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

```

**frontend/src/store/useAuthStore.ts**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  subscriptionStatus: 'free' | 'premium';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage', // persisted to localStorage
    }
  )
);

```

## 4. Setup Instructions
1. Clone the repository.
2. In the `backend` folder, run `npm install`.
3. In the `frontend` folder, run `npm install`.
4. Create a `.env` file in the `backend` folder with `MONGO_URI=your_db_url` and `JWT_SECRET=your_secret`.
5. Run `npm run dev` in the `backend` folder to start the server.
6. Run `npm run dev` in the `frontend` folder to start the React app.

## 5. Common Bugs/Limitations
- **Canvas CORS**: If you load external images onto the canvas without proper CORS headers from the image host, the canvas becomes "tainted" and you won't be able to export or share the image.
- **Mobile View**: The Editor layout works best on desktop or tablet. On small mobile screens, the sliders might overlap if not carefully scrolled.
- **Image Size**: There is no hard limit on uploaded profile pictures yet, which could cause slight lag on the canvas if a user uploads a 10MB image.

## 6. Explanations
- **State Management**: Used Zustand. It's incredibly simple, requires no wrappers, and does exactly what we need (storing the user session) without the boilerplate of Redux.
- **UI Design**: Flat and practical. I intentionally avoided glowing gradients and complex glassmorphism because a standard utility-focused design is easier to maintain, faster to load, and more reliable across different devices.
