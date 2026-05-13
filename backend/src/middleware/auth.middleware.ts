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
