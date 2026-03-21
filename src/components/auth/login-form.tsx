"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "登录失败");
        return;
      }

      router.replace(nextPath || result.redirectTo || "/admin");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 rounded-[2rem] border border-[#d8e0d9] bg-white/80 p-8 shadow-[0_24px_60px_rgba(30,55,45,0.08)]"
    >
      <div className="text-lg text-[#163028]">登录系统</div>
      <div className="mt-5 grid gap-4">
        <input
          name="email"
          type="email"
          required
          placeholder="邮箱"
          className="rounded-2xl border border-[#d9e3db] bg-white px-4 py-3 outline-none"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="密码"
          className="rounded-2xl border border-[#d9e3db] bg-white px-4 py-3 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-5 rounded-full bg-[#163028] px-5 py-3 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "登录中..." : "登录"}
      </button>
      {error ? <p className="mt-4 text-sm text-[#922f22]">{error}</p> : null}
    </form>
  );
}
