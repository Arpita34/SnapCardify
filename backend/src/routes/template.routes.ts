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
