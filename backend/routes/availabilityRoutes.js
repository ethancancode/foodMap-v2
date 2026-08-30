import { Router } from 'express';
import * as availabilityController from '../controllers/availabilityController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:foodId', availabilityController.getAvailability);
router.put('/:foodId', protect, availabilityController.updateAvailability);

export default router;
