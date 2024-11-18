import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  GROUP_TARGET_JID: z.string(),
  BOT_NAME: z.string(),
  AI_TOKEN: z.string(),
  SESSION_NAME: z.string(),
  CREATE_SESSION: z.string().transform((v) => v.toLowerCase() === "true"),
  START_CREATE_TASK: z.string().transform((v) => v.toLowerCase() === "true"),
  X_API_KEY: z.string(),
  ACCESS_KEY_ID: z.string(),
  SECRET_KEY_ID: z.string(),
  ENDPOINT: z.string(),
  BUCKET_NAME: z.string(),
});

export const env = envSchema.parse(process.env);
