"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AffiliateSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  domainCount: number;
  returnUrlCount: number;
};

type UserSummary = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  affiliateNames: string[];
};

type UserManagementPanelProps = {
  affiliates: AffiliateSummary[];
  users: UserSummary[];
};

export function UserManagementPanel({ affiliates, users }: UserManagementPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const formElement = event.currentTarget;
          const formData = new FormData(formElement);
          startTransition(async () => {
            const response = await fetch("/api/admin/users", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: formData.get("email"),
                displayName: formData.get("displayName"),
                password: formData.get("password"),
                role: formData.get("role"),
                affiliateId: formData.get("affiliateId") || null,
              }),
            });

            const result = await response.json();

            if (result.ok) {
              formElement.reset();
              setMessage("后台账号已创建，列表已刷新。");
              router.refresh();
              return;
            }

            setMessage(result.message ?? "创建失败");
          });
        }}
      >
        <div className="text-lg">创建后台账号</div>
        <div className="mt-4 grid gap-3">
          <input
            name="email"
            type="email"
            placeholder="登录邮箱"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            name="displayName"
            placeholder="显示名称"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            name="password"
            type="password"
            placeholder="登录密码"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <select name="role" className="rounded-xl bg-white/10 px-4 py-3 outline-none">
            <option value="AFFILIATE_ADMIN">分销商后台账号</option>
            <option value="SUPER_ADMIN">超级管理员账号</option>
          </select>
          <select name="affiliateId" className="rounded-xl bg-white/10 px-4 py-3 outline-none">
            <option value="">不绑定分销商</option>
            {affiliates.map((affiliate) => (
              <option key={affiliate.id} value={affiliate.id}>
                {affiliate.name} ({affiliate.code})
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
          disabled={isPending}
        >
          保存账号
        </button>
        <div className="mt-4 text-sm text-emerald-300">{message}</div>
      </form>

      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
        <div className="text-lg">现有后台账号</div>
        <div className="mt-4 space-y-3 text-sm text-slate-200">
          {users.length === 0 ? (
            <div className="text-slate-400">暂无账号数据</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>{user.displayName}</div>
                <div className="mt-1 text-slate-400">{user.email}</div>
                <div className="mt-2 text-slate-300">
                  角色：{user.role} / 分销商：{user.affiliateNames.join("、") || "无"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
