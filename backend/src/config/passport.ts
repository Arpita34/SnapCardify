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
      proxy: true,
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
