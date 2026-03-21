import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseProvider = process.env.DATABASE_PROVIDER ?? "sqlite";
const databaseUrl =
  process.env.DATABASE_URL ??
  (databaseProvider === "postgresql"
    ? "postgresql://postgres:postgres@localhost:5432/shopa"
    : "file:./dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx scripts/seed-products.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
