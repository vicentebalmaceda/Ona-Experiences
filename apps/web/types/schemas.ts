import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
  offset: z.coerce.number().int().min(0).default(0)
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive()
});

export type ProductIdParams = z.infer<typeof productIdParamSchema>;

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

export const saleRequestSchema = z
  .object({
    quantity: z.coerce.number().int().min(1).default(1),
    customer: customerSchema,
    reservationDate: isoDateSchema,
    reservationEndDate: isoDateSchema,
    notes: z.string().min(10, 'Explanation must be at least 10 characters'),
    emissionDate: isoDateSchema.optional(),
    expirationDate: isoDateSchema.optional()
  })
  .refine((data) => data.reservationEndDate >= data.reservationDate, {
    message: 'reservationEndDate must be on or after reservationDate',
    path: ['reservationEndDate']
  });

export type SaleRequestBody = z.infer<typeof saleRequestSchema>;
