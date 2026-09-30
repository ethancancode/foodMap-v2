import { Router } from 'express';
import * as vendorController from '../controllers/vendorController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { updateVendorSchema } from '../validations/vendorValidation.js';

const router = Router();

router.get('/', vendorController.getVendors);
router.get('/me', protect, vendorController.getMyVendorProfile);
router.get('/me/analytics', protect, vendorController.getVendorAnalytics);
router.get('/me/demand-prediction', protect, vendorController.getDemandPrediction);
router.get('/:id/analytics', optionalAuth, vendorController.getVendorAnalytics);
router.get('/:id/demand-prediction', optionalAuth, vendorController.getDemandPrediction);
router.post('/:id/follow', protect, vendorController.toggleFollowVendor);
router.get('/:id', vendorController.getVendorById);
router.get('/:id/reviews', vendorController.getReviews);
router.post('/:id/reviews', optionalAuth, vendorController.submitReview);
router.put('/me', protect, validate(updateVendorSchema), vendorController.updateVendor);
router.put('/:id', protect, validate(updateVendorSchema), vendorController.updateVendor);

export default router;

