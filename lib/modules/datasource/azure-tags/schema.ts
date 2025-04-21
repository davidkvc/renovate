import { z } from 'zod';

export const AzureTagSchema = z.object({
  name: z.string(),
});
