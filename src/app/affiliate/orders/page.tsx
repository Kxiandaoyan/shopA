import Link from "next/link";
import { requireAffiliateAdmin } from "@/lib/auth/access";
import { normalizeAffiliateOrderFilters } from "@/lib/affiliate/order-filters";
import { loadAffiliateOrders, loadAffiliateOrderStats } from "@/lib/affiliate/orders";

export const dynamic = "force-dynamic";

type AffiliateOrdersPageProps = {
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
  return `/affiliate/orders?${search.toString()}`;
}

export default async function AffiliateOrdersPage({ searchParams }: AffiliateOrdersPageProps) {
  const session = await requireAffiliateAdmin();
  const params = await searchParams;
  const page = Math.max(
    1,
    typeof params.page === "string" ? Number.parseInt(params.page, 10) || 1 : 1,
  );
  const filters = normalizeAffiliateOrderFilters({
    status: typeof params.status === "string" ? params.status : undefined,
    query: typeof params.q === "string" ? params.q : undefined,
    domain: typeof params.domain === "string" ? params.domain : undefined,
  });
  const [orders, stats] = await Promise.all([
    loadAffiliateOrders(session.affiliateIds, filters, { page, pageSize: 30 }),
    loadAffiliateOrderStats(session.affiliateIds),
  ]);

  return (
    <main className="min-h-screen bg-stone-100 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">订单列表</div>
        <h1 className="mt-3 text-3xl">仅展示当前分销商来源订单</h1>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-[1.4rem] border border-stone-200 bg-white p-4">
            <div className="text-xs text-slate-500">总订单</div>
            <div className="mt-2 text-2xl">{stats.total}</div>
          </div>
          <div className="rounded-[1.4rem] border border-stone-200 bg-white p-4">
            <div className="text-xs text-slate-500">已支付</div>
            <div className="mt-2 text-2xl">{stats.paid}</div>
          </div>
          <div className="rounded-[1.4rem] border border-stone-200 bg-white p-4">
            <div className="text-xs text-slate-500">失败</div>
            <div className="mt-2 text-2xl">{stats.failed}</div>
          </div>
          <div className="rounded-[1.4rem] border border-stone-200 bg-white p-4">
            <div className="text-xs text-slate-500">未支付</div>
            <div className="mt-2 text-2xl">{stats.draft}</div>
          </div>
          <div className="rounded-[1.4rem] border border-stone-200 bg-white p-4">
            <div className="text-xs text-slate-500">已取消</div>
            <div className="mt-2 text-2xl">{stats.canceled}</div>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-[1.6rem] border border-stone-200 bg-white p-5 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input
            name="q"
            placeholder="搜索外部订单号 / 买家邮箱 / 姓名"
            defaultValue={filters.query ?? ""}
            className="rounded-xl border border-stone-200 px-4 py-3 outline-none"
          />
          <input
            name="domain"
            placeholder="域名包含"
            defaultValue={filters.domain ?? ""}
            className="rounded-xl border border-stone-200 px-4 py-3 outline-none"
          />
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-xl border border-stone-200 px-4 py-3 outline-none"
          >
            <option value="">全部状态</option>
            <option value="PAID">已支付</option>
            <option value="FAILED">支付失败</option>
            <option value="DRAFT">未付款</option>
            <option value="CHECKOUT_CREATED">已创建支付</option>
            <option value="CANCELED">已取消</option>
            <option value="EXPIRED">已过期</option>
          </select>
          <button className="rounded-full bg-slate-900 px-5 py-3 text-sm text-white">筛选</button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <div>
            第 {orders.page} / {orders.totalPages} 页，共 {orders.total} 条
          </div>
          <div className="flex gap-3">
            {orders.page > 1 ? (
              <Link
                href={buildPageHref(params, orders.page - 1)}
                className="rounded-full border border-stone-300 px-4 py-2"
              >
                上一页
              </Link>
            ) : null}
            {orders.page < orders.totalPages ? (
              <Link
                href={buildPageHref(params, orders.page + 1)}
                className="rounded-full border border-stone-300 px-4 py-2"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-slate-600">
              <tr>
                <th className="px-5 py-4">订单号</th>
                <th className="px-5 py-4">外部订单</th>
                <th className="px-5 py-4">买家</th>
                <th className="px-5 py-4">状态</th>
                <th className="px-5 py-4">金额</th>
                <th className="px-5 py-4">域名</th>
                <th className="px-5 py-4">时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.items.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={7}>
                    暂无符合筛选条件的订单。
                  </td>
                </tr>
              ) : (
                orders.items.map((order) => (
                  <tr key={order.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <div>{order.id}</div>
                      <Link
                        href={`/affiliate/orders/${order.id}`}
                        className="mt-3 inline-flex rounded-full border border-stone-300 px-3 py-1.5 text-xs"
                      >
                        查看详情
                      </Link>
                    </td>
                    <td className="px-5 py-4">{order.externalOrderId}</td>
                    <td className="px-5 py-4">
                      <div>{order.buyerName}</div>
                      <div className="text-slate-500">{order.buyerEmail}</div>
                    </td>
                    <td className="px-5 py-4">{order.status}</td>
                    <td className="px-5 py-4">
                      {order.currency} {order.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">{order.domain}</td>
                    <td className="px-5 py-4">{order.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
