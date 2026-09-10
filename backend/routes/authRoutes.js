import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { requestOtpSchema, verifyOtpSchema, completeOnboardingSchema } from '../validations/authValidation.js';

const router = Router();

router.post('/request-otp', validate(requestOtpSchema), authController.requestOTP);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOTP);
router.get('/me', protect, authController.getMe);
router.put('/profile', protect, authController.updateProfile);
router.post('/complete-onboarding', protect, validate(completeOnboardingSchema), authController.completeOnboarding);

export default router;

