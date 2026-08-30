import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../validations/orderValidation.js';

const router = Router();

router.get('/', protect, orderController.getOrders);
router.get('/:id', protect, orderController.getOrderById);
router.post('/', protect, validate(createOrderSchema), orderController.createOrder);
router.patch('/:id/status', protect, validate(updateOrderStatusSchema), orderController.updateOrderStatus);
router.put('/:id/status', protect, validate(updateOrderStatusSchema), orderController.updateOrderStatus);

export default router;
