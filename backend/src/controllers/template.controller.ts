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
      .limit(+limit);
    
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
