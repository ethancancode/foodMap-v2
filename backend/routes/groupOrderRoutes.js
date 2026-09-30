import { Router } from 'express';
import * as groupOrderController from '../controllers/groupOrderController.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/create', protect, groupOrderController.createGroupOrder);
router.get('/:code', optionalAuth, groupOrderController.getGroupOrderByCode);
router.post('/:code/join', protect, groupOrderController.joinGroupOrder);
router.post('/:code/items', protect, groupOrderController.addItemToGroupOrder);
router.patch('/:code/items/:foodId', protect, groupOrderController.updateGroupOrderItem);
router.delete('/:code/items/:foodId', protect, groupOrderController.removeGroupOrderItem);
router.post('/:code/checkout', protect, groupOrderController.checkoutGroupOrder);

export default router;
