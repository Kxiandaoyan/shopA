"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/auth/logout", {
            method: "POST",
          });
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      {isPending ? "退出中..." : "退出登录"}
    </button>
  );
}
