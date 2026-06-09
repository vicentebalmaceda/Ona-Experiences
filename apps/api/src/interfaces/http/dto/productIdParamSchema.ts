import { z } from 'zod';

export const productIdParamSchema = z.object({
  productId: z.coerce.number().int().positive()
});

export type ProductIdParams = z.infer<typeof productIdParamSchema>;
