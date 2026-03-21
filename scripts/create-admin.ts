import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

function readRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

async function main() {
  const email = readRequiredEnv("ADMIN_EMAIL").toLowerCase();
  const password = readRequiredEnv("ADMIN_PASSWORD");
  const displayName = process.env.ADMIN_NAME?.trim() || "Super Admin";

  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      displayName,
      role: UserRole.SUPER_ADMIN,
      passwordHash: hashPassword(password),
    },
    create: {
      email,
      displayName,
      role: UserRole.SUPER_ADMIN,
      passwordHash: hashPassword(password),
    },
  });

  console.log(`Super admin ready: ${user.email}`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
