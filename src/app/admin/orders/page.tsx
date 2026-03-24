import Link from "next/link";
import {
  loadAdminOrderAnomalies,
  loadAdminOrderStats,
  loadAdminOrderSummaries,
} from "@/lib/admin/orders";
import { normalizeAdminOrderFilters } from "@/lib/admin/order-filters";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (key === "page") {
      continue;
    }

    if (typeof value === "string" && value) {
      search.set(key, value);
    }
  }

  search.set("page", page.toString());
  return `/admin/orders?${search.toString()}`;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const page = Math.max(
    1,
    typeof params.page === "string" ? Number.parseInt(params.page, 10) || 1 : 1,
  );
  const filters = normalizeAdminOrderFilters({
    orderId: typeof params.orderId === "string" ? params.orderId : undefined,
    externalOrderId:
      typeof params.externalOrderId === "string" ? params.externalOrderId : undefined,
    affiliate: typeof params.affiliate === "string" ? params.affiliate : undefined,
    domain: typeof params.domain === "string" ? params.domain : undefined,
    buyer: typeof params.buyer === "string" ? params.buyer : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    source: typeof params.source === "string" ? params.source : undefined,
  });

  const [orders, stats, anomalies] = await Promise.all([
    loadAdminOrderSummaries(filters, { page, pageSize: 30 }),
    loadAdminOrderStats(),
    loadAdminOrderAnomalies(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">全局订单中心</div>
            <h1 className="mt-3 text-3xl">所有订单与支付流转</h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
              这里集中查看站内直购与分销来源订单，支持按订单号、分销商、域名、买家、状态和来源筛选。
            </p>
          </div>
          <Link
            href="/admin/orders/anomalies"
            className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm text-amber-100"
          >
            查看异常订单 ({anomalies.total})
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-6">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">总订单</div>
            <div className="mt-2 text-2xl">{stats.total}</div>
          </div>
          <div className="rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-xs text-emerald-200">已支付</div>
            <div className="mt-2 text-2xl text-white">{stats.paid}</div>
          </div>
          <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="text-xs text-amber-200">待支付</div>
            <div className="mt-2 text-2xl text-white">{stats.pending}</div>
          </div>
          <div className="rounded-[1.4rem] border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="text-xs text-rose-200">失败</div>
            <div className="mt-2 text-2xl text-white">{stats.failed}</div>
          </div>
          <div className="rounded-[1.4rem] border border-sky-500/20 bg-sky-500/10 p-4">
            <div className="text-xs text-sky-200">站内直购</div>
            <div className="mt-2 text-2xl text-white">{stats.direct}</div>
          </div>
          <div className="rounded-[1.4rem] border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
            <div className="text-xs text-fuchsia-200">分销来源</div>
            <div className="mt-2 text-2xl text-white">{stats.affiliate}</div>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_0.9fr_auto]">
          <input
            name="orderId"
            placeholder="订单号"
            defaultValue={filters.orderId ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="externalOrderId"
            placeholder="外部订单号"
            defaultValue={filters.externalOrderId ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="buyer"
            placeholder="买家邮箱 / 姓名 / 手机"
            defaultValue={filters.buyer ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="affiliate"
            placeholder="分销商编码 / 名称"
            defaultValue={filters.affiliate ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="domain"
            placeholder="域名包含"
            defaultValue={filters.domain ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部状态</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="LANDING_VISITED">LANDING_VISITED</option>
            <option value="CHECKOUT_CREATED">CHECKOUT_CREATED</option>
            <option value="CANCELED">CANCELED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
          <select
            name="source"
            defaultValue={filters.source ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部来源</option>
            <option value="affiliate">分销来源</option>
            <option value="direct">站内直购</option>
          </select>
          <button className="rounded-full bg-white px-5 py-3 text-sm text-slate-950">筛选</button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <div>
            第 {orders.page} / {orders.totalPages} 页，共 {orders.total} 条
          </div>
          <div className="flex gap-3">
            {orders.page > 1 ? (
              <Link
                href={buildPageHref(params, orders.page - 1)}
                className="rounded-full border border-white/10 px-4 py-2 text-white"
              >
                上一页
              </Link>
            ) : null}
            {orders.page < orders.totalPages ? (
              <Link
                href={buildPageHref(params, orders.page + 1)}
                className="rounded-full border border-white/10 px-4 py-2 text-white"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-white/10">
          <table className="min-w-full bg-white/5 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-4">来源</th>
                <th className="px-5 py-4">订单</th>
                <th className="px-5 py-4">买家</th>
                <th className="px-5 py-4">分销商</th>
                <th className="px-5 py-4">域名</th>
                <th className="px-5 py-4">订单状态</th>
                <th className="px-5 py-4">支付状态</th>
                <th className="px-5 py-4">金额</th>
                <th className="px-5 py-4">回跳</th>
                <th className="px-5 py-4">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.items.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={10}>
                    暂无符合筛选条件的订单。
                  </td>
                </tr>
              ) : (
                orders.items.map((order) => (
                  <tr key={order.id} className="border-t border-white/10 align-top">
                    <td className="px-5 py-4">{order.source === "direct" ? "站内直购" : "分销"}</td>
                    <td className="px-5 py-4">
                      <div>{order.id}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.externalOrderId}</div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-white"
                      >
                        查看详情
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div>{order.buyerName}</div>
                      <div className="mt-1 text-slate-400">{order.buyerEmail}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.buyerPhone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div>{order.affiliateName}</div>
                      <div className="mt-1 text-xs text-slate-500">{order.affiliateCode}</div>
                    </td>
                    <td className="px-5 py-4">{order.domain}</td>
                    <td className="px-5 py-4">{order.status}</td>
                    <td className="px-5 py-4">{order.paymentStatus}</td>
                    <td className="px-5 py-4">
                      {order.currency} {order.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">{order.hasReturnUrl ? "有" : "无"}</td>
                    <td className="px-5 py-4">{order.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
