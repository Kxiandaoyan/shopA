import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type DatabaseProvider = "sqlite" | "postgresql";

const provider = (process.argv[2] as DatabaseProvider | undefined) ?? "sqlite";

if (provider !== "sqlite" && provider !== "postgresql") {
  console.error("Usage: tsx scripts/switch-db.ts <sqlite|postgresql>");
  process.exit(1);
}

const rootDir = process.cwd();
const schemaSourcePath = path.join(rootDir, "prisma", "schema.postgresql.prisma");
const activeSchemaPath = path.join(rootDir, "prisma", "schema.prisma");
const envPath = path.join(rootDir, ".env");
const exampleEnvPath = path.join(rootDir, ".env.example");

function buildSchema(target: DatabaseProvider) {
  const source = readFileSync(schemaSourcePath, "utf8");

  if (target === "postgresql") {
    return source;
  }

  return source
    .replace('provider = "postgresql"', 'provider = "sqlite"')
    .replace(/ +@db\.Decimal\(10, 2\)/g, "");
}

function upsertEnvValue(content: string, key: string, value: string) {
  const nextLine = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, nextLine);
  }

  return `${content.trimEnd()}\n${nextLine}\n`;
}

function updateEnvFile(target: DatabaseProvider) {
  const fallback = existsSync(exampleEnvPath) ? readFileSync(exampleEnvPath, "utf8") : "";
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : fallback;
  const databaseUrl =
    target === "postgresql"
      ? "postgresql://postgres:postgres@localhost:5432/shopa"
      : "file:./dev.db";

  let next = current;
  next = upsertEnvValue(next, "DATABASE_PROVIDER", target);
  next = upsertEnvValue(next, "DATABASE_URL", databaseUrl);
  writeFileSync(envPath, next, "utf8");
}

writeFileSync(activeSchemaPath, buildSchema(provider), "utf8");
updateEnvFile(provider);

execSync("npx prisma generate", {
  stdio: "inherit",
  cwd: rootDir,
});

console.log(`Switched database provider to ${provider}.`);
if (provider === "sqlite") {
  console.log("Next steps: npm run db:push && npm run seed:products");
} else {
  console.log("Next steps: npx prisma migrate deploy && npm run seed:products");
}
