import { Router } from 'express';
import * as vendorController from '../controllers/vendorController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { updateVendorSchema } from '../validations/vendorValidation.js';

const router = Router();

router.get('/', vendorController.getVendors);
router.get('/me', protect, vendorController.getMyVendorProfile);
router.get('/:id', vendorController.getVendorById);
router.put('/me', protect, validate(updateVendorSchema), vendorController.updateVendor);
router.put('/:id', protect, validate(updateVendorSchema), vendorController.updateVendor);

export default router;
