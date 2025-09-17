import { z } from 'zod';

export const LinkM3uSchema = z.object({
  type: z.literal('m3u'),
  url: z.string().url(),
  name: z.string().optional()
});

export const LinkXtreamSchema = z.object({
  type: z.literal('xtream'),
  base_url: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().optional()
});

export type LinkM3uDto = z.infer<typeof LinkM3uSchema>;
export type LinkXtreamDto = z.infer<typeof LinkXtreamSchema>;
