import { z } from "zod";

const envSchema = z.object({
  GROUP_TARGET_JID: z.string(),
  BOT_NAME: z.string(),
});

export const env = envSchema.parse(process.env);
