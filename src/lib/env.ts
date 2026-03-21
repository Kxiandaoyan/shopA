import { z } from "zod";

const envSchema = z.object({
  DATABASE_PROVIDER: z.enum(["sqlite", "postgresql"]).default("sqlite"),
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),
  AUTH_SECRET: z.string().min(1).default("replace-me"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  APP_INTERNAL_BASE_URL: z.string().url().default("http://localhost:3000"),
  INTAKE_TOKEN_SECRET: z.string().min(1).default("replace-me"),
  INTAKE_SIGNATURE_SECRET: z.string().optional().default(""),
  STRIPE_SECRET_ENCRYPTION_KEY: z.string().min(1).default("replace-me"),
});

const INSECURE_SECRET_VALUES = new Set(["replace-me", "changeme", "change-me", "test", "secret"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export type AppEnv = z.infer<typeof envSchema>;

type ParseEnvOptions = {
  appEnv?: string;
  vercelEnv?: string;
};

function isRealProduction(options: ParseEnvOptions) {
  return options.appEnv === "production" || options.vercelEnv === "production";
}

function isLocalUrl(value: string) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

function validateProductionEnv(env: AppEnv, options: ParseEnvOptions) {
  if (!isRealProduction(options)) {
    return env;
  }

  const issues: string[] = [];

  if (env.DATABASE_PROVIDER !== "postgresql") {
    issues.push("Production requires PostgreSQL.");
  }

  if (isLocalUrl(env.NEXTAUTH_URL)) {
    issues.push("NEXTAUTH_URL cannot point to localhost in production.");
  }

  if (isLocalUrl(env.APP_INTERNAL_BASE_URL)) {
    issues.push("APP_INTERNAL_BASE_URL cannot point to localhost in production.");
  }

  for (const [key, value] of Object.entries({
    AUTH_SECRET: env.AUTH_SECRET,
    INTAKE_TOKEN_SECRET: env.INTAKE_TOKEN_SECRET,
    STRIPE_SECRET_ENCRYPTION_KEY: env.STRIPE_SECRET_ENCRYPTION_KEY,
  })) {
    if (INSECURE_SECRET_VALUES.has(value.trim().toLowerCase())) {
      issues.push(`${key} is still using a placeholder value.`);
    }
  }

  if (issues.length > 0) {
    throw new Error(`Invalid production environment configuration:\n- ${issues.join("\n- ")}`);
  }

  return env;
}

export function parseEnv(
  input: Partial<Record<keyof AppEnv, string | undefined>>,
  options: ParseEnvOptions = {},
) {
  const parsed = envSchema.parse(input);
  return validateProductionEnv(parsed, options);
}

export const env = parseEnv(
  {
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    APP_INTERNAL_BASE_URL: process.env.APP_INTERNAL_BASE_URL,
    INTAKE_TOKEN_SECRET: process.env.INTAKE_TOKEN_SECRET,
    INTAKE_SIGNATURE_SECRET: process.env.INTAKE_SIGNATURE_SECRET,
    STRIPE_SECRET_ENCRYPTION_KEY: process.env.STRIPE_SECRET_ENCRYPTION_KEY,
  },
  {
    appEnv: process.env.APP_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  },
);
