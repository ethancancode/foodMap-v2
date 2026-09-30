import { Router } from 'express';
import * as subscriptionController from '../controllers/subscriptionController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/plans', optionalAuth, subscriptionController.getSubscriptionPlans);
router.get('/plans/:id', optionalAuth, subscriptionController.getPlanById);
router.post('/plans', protect, subscriptionController.createSubscriptionPlan);

router.post('/subscribe', protect, subscriptionController.subscribeToPlan);
router.get('/my', protect, subscriptionController.getMySubscriptions);
router.get('/vendor', protect, subscriptionController.getVendorSubscriptions);
router.get('/vendor/:vendorId', protect, subscriptionController.getVendorSubscriptions);
router.patch('/:id/cancel', protect, subscriptionController.cancelSubscription);

export default router;
