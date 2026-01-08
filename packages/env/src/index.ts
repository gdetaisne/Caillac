import { z } from "zod";

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";
const isNextBuild =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-production-export";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Next.js peut importer/exécuter des route handlers pendant le build.
  // On autorise DATABASE_URL manquant pendant la phase de build uniquement,
  // mais il restera requis au runtime (start).
  DATABASE_URL: isNextBuild ? z.string().optional().default("postgresql://invalid") : z.string().min(1),

  // Stockage local (CapRover persistent app data)
  UPLOAD_DIR: z.string().min(1).default("/app/data/uploads"),

  // Jobs en DB (polling)
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),

  // Chat (optionnel)
  OPENAI_API_KEY: z.string().min(1).optional(),

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

