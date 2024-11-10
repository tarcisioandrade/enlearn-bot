import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  GROUP_TARGET_JID: z.string(),
  BOT_NAME: z.string(),
  AI_TOKEN: z.string(),
  SESSION_NAME: z.string(),
});

export const env = envSchema.parse(process.env);
