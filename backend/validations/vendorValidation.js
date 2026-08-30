import { z } from 'zod';

export const updateVendorSchema = z.object({
  businessName: z.string().min(2).optional(),
  category: z.string().optional(),
  bio: z.string().optional(),
  status: z.string().optional(),
  coverImage: z.string().optional(),
  pickupAddress: z.string().optional(),
  location: z.any().optional(),
  coordinates: z.array(z.number()).length(2).optional(), // [lng, lat]
}).passthrough();
