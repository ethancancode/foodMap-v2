import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all admin endpoints
router.use(protect, adminOnly);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/vendors', adminController.getAdminVendors);
router.patch('/vendors/:id/verify', adminController.updateVendorVerification);
router.get('/foods', adminController.getAdminFoods);
router.patch('/foods/:id/moderate', adminController.moderateFood);
router.get('/orders', adminController.getAdminOrders);

export default router;
