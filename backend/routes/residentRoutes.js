import { Router } from 'express';
import * as residentController from '../controllers/residentController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/recommendations', optionalAuth, residentController.getRecommendations);
router.put('/allergies', protect, residentController.updateAllergies);
router.get('/profile/:id', optionalAuth, residentController.getProfile);
router.get('/profile', protect, residentController.getProfile);
router.put('/preferences', protect, residentController.updatePreferences);
router.post('/vouch', protect, residentController.vouchVendor);

export default router;

