import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().min(1),

  // Stockage local (CapRover persistent app data)
  UPLOAD_DIR: z.string().min(1).default("/app/data/uploads"),

  // Jobs en DB (polling)
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),

  EXTRACTOR_VERSION: z.string().min(1).default("v1")
});

export type Env = z.infer<typeof EnvSchema>;

function withDevFallbacks(raw: Record<string, unknown>) {
  if (isProd) return raw;
  // En dev, on autorise des défauts pour accélérer le bootstrap.
  // Mais DATABASE_URL reste obligatoire (Postgres).
  return raw;
}

const parsed = EnvSchema.safeParse(withDevFallbacks(process.env as unknown as Record<string, unknown>));

if (!parsed.success) {
  // Message compact et utile (sans dumper tout process.env)
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment: ${issues}`);
}

export const env = parsed.data;

