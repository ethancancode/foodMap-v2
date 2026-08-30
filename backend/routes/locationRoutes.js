import { Router } from 'express';
import * as locationController from '../controllers/locationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/nearby', locationController.getNearby);
router.put('/update', protect, locationController.updateLocation);

export default router;
