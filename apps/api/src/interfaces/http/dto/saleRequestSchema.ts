import { z } from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected ISO date YYYY-MM-DD');

export const customerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  municipality: z.string().optional(),
  activity: z.string().optional(),
  companyOrPerson: z.union([z.literal(0), z.literal(1)]).optional(),
  isForeigner: z.union([z.literal(0), z.literal(1)]).optional()
});

export const saleRequestSchema = z.object({
  quantity: z.coerce.number().int().min(1).default(1),
  customer: customerSchema,
  reservationDate: isoDateSchema,
  notes: z.string().min(10, 'Explanation must be at least 10 characters'),
  emissionDate: isoDateSchema.optional(),
  expirationDate: isoDateSchema.optional()
});

export type SaleRequestBody = z.infer<typeof saleRequestSchema>;
