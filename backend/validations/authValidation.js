import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  role: z.enum(['resident', 'vendor']).optional().default('resident'),
  name: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number is required'),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
  name: z.string().optional(),
});
