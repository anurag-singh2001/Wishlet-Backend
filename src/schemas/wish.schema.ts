import { z } from "zod";

export const CreateWishSchema = z.object({
  templateId: z.string().min(1, "templateId is required"),
  occasion: z.string().min(1, "occasion is required"),
  content: z.record(z.string(), z.any()),
});

export type CreateWishInput = z.infer<typeof CreateWishSchema>;

export const GetWishParamsSchema = z.object({
  slug: z.string().min(1, "slug is required"),
});

export const DeleteWishHeadersSchema = z.object({
  "x-delete-token": z.string().min(1, "X-Delete-Token header is required"),
});
