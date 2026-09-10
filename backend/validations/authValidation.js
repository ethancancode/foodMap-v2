import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  role: z.enum(['resident', 'vendor']).optional().default('resident'),
  name: z.string().optional(),
  businessName: z.string().optional(),
  specialties: z.string().optional(),
  category: z.string().optional(),
  pickupAddress: z.string().optional(),
  coordinates: z.array(z.number()).length(2).optional(),
}).passthrough();

export const verifyOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number is required'),
  otp: z.string().min(6, 'Verification code must be 6 digits').max(6, 'Verification code must be 6 digits'),
  role: z.enum(['resident', 'vendor']).optional(),
  name: z.string().optional(),
  businessName: z.string().optional(),
  specialties: z.string().optional(),
  category: z.string().optional(),
  pickupAddress: z.string().optional(),
  coordinates: z.array(z.number()).length(2).optional(),
}).passthrough();

export const completeOnboardingSchema = z.object({
  role: z.enum(['resident', 'vendor']).optional(),
  name: z.string().optional(),
  residentName: z.string().optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  dietaryPreference: z.string().optional(),
  radarDistanceLimit: z.number().optional(),
  avatar: z.string().optional(),
  chefName: z.string().optional(),
  kitchenName: z.string().optional(),
  businessName: z.string().optional(),
  specialties: z.string().optional(),
  category: z.string().optional(),
  pickupAddress: z.string().optional(),
  coordinates: z.array(z.number()).length(2).optional(),
  bio: z.string().optional(),
  experience: z.string().optional(),
  coverImage: z.string().optional(),
}).passthrough();

