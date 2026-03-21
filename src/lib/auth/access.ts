import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireSuperAdmin() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    redirect("/affiliate");
  }

  return session;
}

export async function requireAffiliateAdmin() {
  const session = await requireSession();

  if (session.role !== "AFFILIATE_ADMIN") {
    redirect("/admin");
  }

  return session;
}
