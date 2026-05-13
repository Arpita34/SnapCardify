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

