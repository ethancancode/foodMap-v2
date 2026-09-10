import { z } from 'zod';

export const createFoodSchema = z.object({
  name: z.string().min(2, 'Food item name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be 0 or positive'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  initialQuantity: z.coerce.number().optional(),
  isVeg: z.boolean().optional().default(true),
  diet: z.string().optional(),
  category: z.string().optional().default('Main Course'),
  timeReady: z.string().optional(),
  cookingStatus: z.string().optional(),
  image: z.string().optional(),
  spiciness: z.string().optional().default('Medium'),
  fulfillmentOptions: z.string().optional().default('BOTH'),
  vendorName: z.string().optional(),
  vendorLocation: z.any().optional(),
}).passthrough();

export const updateFoodSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().min(0).optional(),
  initialQuantity: z.coerce.number().optional(),
  available: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  status: z.string().optional(),
  fulfillmentOptions: z.string().optional(),
  image: z.string().optional(),
  timeReady: z.string().optional(),
  cookingStatus: z.string().optional(),
}).passthrough();
