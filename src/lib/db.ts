import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  if (env.DATABASE_PROVIDER === "postgresql") {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
    });
  }

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: env.DATABASE_URL }),
  });
}

export const db = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
