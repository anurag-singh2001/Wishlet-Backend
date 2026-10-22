import { z } from "zod";

export const GoogleAuthBodySchema = z.object({
  credential: z.string().min(1, "credential is required"),
});

export const ClaimBodySchema = z.object({
  wishes: z.array(z.object({ slug: z.string().min(1), token: z.string().min(1) })).max(50),
});
