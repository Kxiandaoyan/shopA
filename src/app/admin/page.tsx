import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { loadAdminDashboardStats, loadAdminLogStats, loadAdminAuditStats } from "@/lib/admin/dashboard";
import { loadAdminOrderAnomalies } from "@/lib/admin/orders";
import { requireSuperAdmin } from "@/lib/auth/access";

export default async function AdminPage() {
  const session = await requireSuperAdmin();
  const [stats, logStats, auditStats, anomalies] = await Promise.all([
    loadAdminDashboardStats(),
    loadAdminLogStats(),
    loadAdminAuditStats(),
    loadAdminOrderAnomalies(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">超级管理员后台</div>
            <h1 className="mt-3 text-3xl">商城运营总览</h1>
            <p className="mt-2 text-sm text-slate-400">
              {session.displayName} / {session.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          这里用于管理分销商、域名池、Stripe 绑定、商品资料、全局订单、链路日志与审计日志。
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">分销商</div>
            <div className="mt-2 text-3xl">{stats.affiliates}</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">域名池</div>
            <div className="mt-2 text-3xl">{stats.domains}</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">商品数</div>
            <div className="mt-2 text-3xl">{stats.products}</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">订单总数</div>
            <div className="mt-2 text-3xl">{stats.orders}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.6rem] border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="text-xs text-emerald-200">已支付</div>
            <div className="mt-2 text-3xl text-white">{stats.paid}</div>
          </div>
          <div className="rounded-[1.6rem] border border-amber-500/20 bg-amber-500/10 p-5">
            <div className="text-xs text-amber-200">待支付 / 处理中</div>
            <div className="mt-2 text-3xl text-white">{stats.draft}</div>
          </div>
          <div className="rounded-[1.6rem] border border-rose-500/20 bg-rose-500/10 p-5">
            <div className="text-xs text-rose-200">失败订单</div>
            <div className="mt-2 text-3xl text-white">{stats.failed}</div>
          </div>
          <div className="rounded-[1.6rem] border border-sky-500/20 bg-sky-500/10 p-5">
            <div className="text-xs text-sky-200">异常订单</div>
            <div className="mt-2 text-3xl text-white">{anomalies.total}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">链路日志</div>
            <div className="mt-2 text-3xl">{logStats.total}</div>
            <div className="mt-3 text-sm text-slate-400">
              成功 {logStats.successes} / 失败 {logStats.failures}
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-slate-400">审计日志</div>
            <div className="mt-2 text-3xl">{auditStats.total}</div>
            <div className="mt-3 text-sm text-slate-400">
              成功 {auditStats.successes} / 失败 {auditStats.failures}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Link
            href="/admin/orders"
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-lg">全局订单中心</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              查看所有订单、支付状态、订单来源、域名、分销商和回跳信息。
            </p>
          </Link>
          <Link
            href="/admin/orders/anomalies"
            className="rounded-[1.6rem] border border-amber-400/20 bg-amber-400/10 p-6 transition hover:bg-amber-400/15"
          >
            <div className="text-lg">异常订单</div>
            <p className="mt-3 text-sm leading-7 text-amber-100">
              集中处理卡在支付流程、缺 Stripe 绑定或状态不一致的订单。
            </p>
          </Link>
          <Link
            href="/admin/products"
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-lg">商品管理</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              编辑商品名称、图片、价格、描述与卖点，不再依赖手动改 TXT。
            </p>
          </Link>
          <Link
            href="/admin/domains"
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-lg">域名与模板配置</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              管理域名池、模板分配、Stripe 绑定、分销商与回跳白名单。
            </p>
          </Link>
          <Link
            href="/admin/logs"
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-lg">详细日志</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              排查接单、落地页、二跳、支付回调和回跳分销站的完整链路。
            </p>
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-lg">审计日志</div>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              查看后台配置修改、日志导出、状态同步和人工回跳重发等关键操作记录。
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
