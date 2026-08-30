import { z } from 'zod';

export const createOrderSchema = z.object({
  vendorId: z.string().optional(),
  foodId: z.string().optional(),
  quantity: z.coerce.number().optional(),
  items: z.array(
    z.object({
      foodId: z.string().min(1, 'Food ID is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    })
  ).optional(),
  orderType: z.string().optional().default('PICKUP'),
  fulfillment: z.string().optional(),
  specialInstructions: z.string().optional(),
  residentName: z.string().optional(),
  residentPhone: z.string().optional(),
  residentLocation: z.any().optional(),
}).passthrough();

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required').transform((s) => s.toUpperCase()),
  rejectionReason: z.string().optional(),
  note: z.string().optional(),
}).passthrough();
