import express from 'express';
import { createCheckoutSession, verifyPayment } from '../controllers/subscription.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/create-order', protect, createCheckoutSession);
router.post('/verify', protect, verifyPayment);

export default router;
