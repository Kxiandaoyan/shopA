import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAffiliateAdmin } from "@/lib/auth/access";

export default async function AffiliatePage() {
  const session = await requireAffiliateAdmin();

  return (
    <main className="min-h-screen bg-stone-100 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">分销商后台</div>
            <h1 className="mt-3 text-3xl">分销订单工作台</h1>
            <p className="mt-2 text-sm text-slate-600">
              {session.displayName} / {session.email}
            </p>
          </div>
          <LogoutButton />
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
          这里提供订单查询、状态筛选、来源域名查看和回跳追踪能力。
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/affiliate/orders"
            className="rounded-[1.6rem] border border-slate-200 bg-white p-6 transition hover:border-slate-300"
          >
            <div className="text-lg">查看订单</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              仅查看当前分销商来源的成功、失败、未付款和已取消订单。
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
