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
