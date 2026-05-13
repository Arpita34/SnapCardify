import express from 'express';
import { getProfile, updateProfile, uploadProfilePicture } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

export default router;
