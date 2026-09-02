import { z } from 'zod';

export const inventionInputSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(255),
  problem: z.string().min(5, 'Problem statement is required'),
  solution: z.string().min(5, 'Solution description is required'),
  howItWorks: z.string().min(5, 'Detailed mechanism description is required'),
  advantages: z.string().min(5, 'Key advantages description is required'),
  differentiation: z.string().min(5, 'Differentiation description is required'),
  domain: z.string().min(2, 'Domain is required'),
  industry: z.string().min(2, 'Industry is required'),
});

export const inventionUpdateSchema = inventionInputSchema.partial().extend({
  status: z.enum(['DRAFT', 'ANALYZING', 'ANALYZED', 'PATENT_READY', 'ARCHIVED']).optional(),
});

export type InventionInputSchema = z.infer<typeof inventionInputSchema>;
export type InventionUpdateSchema = z.infer<typeof inventionUpdateSchema>;
