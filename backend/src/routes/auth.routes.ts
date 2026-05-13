import express from 'express';
import passport from 'passport';
import '../config/passport'; // Initialize Google Strategy
import { register, login } from '../controllers/auth.controller';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

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
