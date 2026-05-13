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
