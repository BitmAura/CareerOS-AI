export const ENV_SCHEMA = {
  NODE_ENV: "development",
  PORT: 3001,
  API_PREFIX: "api",
  CORS_ORIGIN: "http://localhost:3000",
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  DATABASE_URL: "file:./careeros.db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "change-me-in-production",
  JWT_EXPIRY: "7d",
  THROTTLE_TTL: 60000,
  THROTTLE_LIMIT: 100,
  BULLMQ_PREFIX: "careeros",
  QUEUE_RESUME: "resume",
  QUEUE_PARSING: "parsing",
  QUEUE_MATCHING: "matching",
  QUEUE_AI: "ai",
  QUEUE_NOTIFICATION: "notification",
  QUEUE_APPLICATION: "application",
} as const;

export type EnvSchema = typeof ENV_SCHEMA;

export function validateEnv() {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Missing env vars: ${missing.join(", ")}`);
  }
}
