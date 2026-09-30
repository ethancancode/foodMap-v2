import { Router } from 'express';
import * as orderController from '../controllers/orderController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';
import { createOrderSchema, updateOrderStatusSchema } from '../validations/orderValidation.js';

const router = Router();

router.get('/delivery/available', protect, requireRole('delivery_partner', 'courier', 'admin'), orderController.getAvailableDeliveries);
router.get('/delivery/my-deliveries', protect, requireRole('delivery_partner', 'courier', 'admin'), orderController.getMyDeliveries);
router.patch('/:id/accept-delivery', protect, requireRole('delivery_partner', 'courier', 'admin'), orderController.acceptDelivery);
router.patch('/:id/delivery-status', protect, requireRole('delivery_partner', 'courier', 'admin'), orderController.updateDeliveryStatus);
router.patch('/:id/delivery-location', protect, requireRole('delivery_partner', 'courier', 'admin'), orderController.updateDeliveryLocation);

router.get('/', protect, orderController.getOrders);
router.get('/:id', protect, orderController.getOrderById);
router.post('/', protect, validate(createOrderSchema), orderController.createOrder);
router.patch('/:id/status', protect, validate(updateOrderStatusSchema), orderController.updateOrderStatus);
router.put('/:id/status', protect, validate(updateOrderStatusSchema), orderController.updateOrderStatus);

export default router;

