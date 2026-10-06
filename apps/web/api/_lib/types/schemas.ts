import { z } from 'zod';
import { formatRutForBsale, isValidRut } from '../utils/rut.js';

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

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

const requiredTrimmed = (max: number) => z.string().trim().min(1).max(max);

/**
 * Customer identity on a quote request. BSale needs a valid Chilean RUT in
 * `code`, or `isForeigner: 1` for foreign guests, so the visitor must choose
 * one of the two. The cotización document type also requires address, city,
 * municipality and region on the client (BSale error cli_004), so those are
 * mandatory too; phone stays optional and the BSale payload mapper fills
 * account defaults (activity, companyOrPerson).
 */
export const customerSchema = z
  .object({
    email: z.string().trim().email(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    documentType: z.enum(['rut', 'passport']).default('rut'),
    rut: optionalTrimmed(20),
    passport: optionalTrimmed(30),
    phone: optionalTrimmed(30),
    address: requiredTrimmed(200),
    city: requiredTrimmed(100),
    municipality: requiredTrimmed(100),
    region: requiredTrimmed(100),
    activity: optionalTrimmed(100),
    companyOrPerson: z.union([z.literal(0), z.literal(1)]).optional(),
    isForeigner: z.union([z.literal(0), z.literal(1)]).optional()
  })
  .superRefine((customer, ctx) => {
    if (customer.documentType !== 'rut') return;
    if (!customer.rut) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rut'], message: 'RUT is required' });
      return;
    }
    if (!isValidRut(customer.rut)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rut'], message: 'Invalid RUT' });
    }
  })
  .transform((customer) => {
    if (customer.documentType === 'passport') {
      return { ...customer, rut: undefined, isForeigner: 1 as const };
    }
    return { ...customer, rut: formatRutForBsale(customer.rut!)!, passport: undefined };
  });

export type CustomerInput = z.infer<typeof customerSchema>;

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
  bsaleDocumentId: z.coerce.number().int().positive(),
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

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export const adminDocumentIdParamSchema = z.object({
  bsaleDocumentId: z.coerce.number().int().positive()
});

export const adminInviteNoteSchema = z.object({
  adminNote: z.string().trim().max(500).optional()
});
