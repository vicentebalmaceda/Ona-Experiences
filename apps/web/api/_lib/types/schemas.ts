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

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000)
});

export type ContactRequestBody = z.infer<typeof contactRequestSchema>;

export const createReviewInviteSchema = z.object({
  catalogType: z.enum(['lodge', 'guide']),
  bsaleProductId: z.coerce.number().int().positive(),
  customer: z.object({
    email: z.string().trim().email().max(320),
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80)
  }),
  bsaleDocumentId: z.coerce.number().int().positive().optional(),
  bsaleVariantId: z.coerce.number().int().positive().optional(),
  adminNote: z.string().trim().max(500).optional()
});

export type CreateReviewInviteBody = z.infer<typeof createReviewInviteSchema>;

export const reviewTokenParamSchema = z.object({
  token: z.string().trim().min(16).max(128)
});

export const submitReviewSchema = z.object({
  token: z.string().trim().min(16).max(128),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(20).max(500)
});

export type SubmitReviewBody = z.infer<typeof submitReviewSchema>;

export const reviewIdParamSchema = z.object({
  reviewId: z.string().uuid()
});

export const hideReviewSchema = z.object({
  hidden: z.boolean()
});
