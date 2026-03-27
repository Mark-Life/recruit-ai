import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
import "./load-root-env";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_URL: z.string().url(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  /**
   * Skip validation in docker builds or CI where env vars aren't available.
   * Set SKIP_ENV_VALIDATION=1 to bypass.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
