import { Router } from 'express';
import * as foodController from '../controllers/foodController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createFoodSchema, updateFoodSchema } from '../validations/foodValidation.js';

const router = Router();

router.get('/', foodController.getFoods);
router.get('/:id', foodController.getFoodById);
router.post('/', protect, validate(createFoodSchema), foodController.createFood);
router.put('/:id', protect, validate(updateFoodSchema), foodController.updateFood);
router.delete('/:id', protect, foodController.deleteFood);

export default router;
