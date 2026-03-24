import Link from "next/link";
import { OrderAnomalyActions } from "@/components/orders/order-anomaly-actions";
import { normalizeAdminOrderAnomalyFilters } from "@/lib/admin/order-anomaly-filters";
import { loadAdminOrderAnomalies } from "@/lib/admin/orders";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

const anomalyLabels = {
  STALE_DRAFT: "停留过久的草稿 / 落地页订单",
  STALE_CHECKOUT: "停留过久的结账订单",
  CHECKOUT_WITHOUT_PAYMENT_SESSION: "结账状态缺少支付会话",
  ACTIVE_ORDER_WITHOUT_STRIPE_BINDING: "活动订单缺少 Stripe 绑定",
  PAID_WITHOUT_SUCCESSFUL_PAYMENT: "已支付订单缺少成功支付记录",
  FAILED_WITHOUT_PAYMENT_RECORD: "失败订单缺少支付记录",
} as const;

type AdminOrderAnomaliesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildExportHref(params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query
    ? `/api/admin/orders/anomalies/export?${query}`
    : "/api/admin/orders/anomalies/export";
}

export default async function AdminOrderAnomaliesPage({
  searchParams,
}: AdminOrderAnomaliesPageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const filters = normalizeAdminOrderAnomalyFilters({
    query: typeof params.q === "string" ? params.q : undefined,
    severity: typeof params.severity === "string" ? params.severity : undefined,
    kind: typeof params.kind === "string" ? params.kind : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    domain: typeof params.domain === "string" ? params.domain : undefined,
  });
  const anomalies = await loadAdminOrderAnomalies(filters);

  return (
    <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">异常订单</div>
            <h1 className="mt-3 text-3xl">订单异常排查中心</h1>
            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
              这里汇总需要人工关注的订单，例如长时间未推进、缺少支付会话、缺少 Stripe
              绑定，或订单状态与支付记录不一致。
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={buildExportHref(params)}
              className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-100"
            >
              导出当前筛选 CSV
            </Link>
            <Link
              href="/admin/orders"
              className="rounded-full border border-white/10 px-5 py-3 text-sm text-white"
            >
              返回订单列表
            </Link>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
          <input
            name="q"
            placeholder="搜索订单号 / 分销商 / 摘要"
            defaultValue={filters.query ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <select
            name="severity"
            defaultValue={filters.severity ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部级别</option>
            <option value="high">高</option>
            <option value="medium">中</option>
          </select>
          <select
            name="kind"
            defaultValue={filters.kind ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部异常类型</option>
            {Object.entries(anomalyLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部订单状态</option>
            <option value="DRAFT">DRAFT</option>
            <option value="LANDING_VISITED">LANDING_VISITED</option>
            <option value="CHECKOUT_CREATED">CHECKOUT_CREATED</option>
            <option value="PAID">PAID</option>
            <option value="FAILED">FAILED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
          <input
            name="domain"
            placeholder="域名包含"
            defaultValue={filters.domain ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <button className="rounded-full bg-white px-5 py-3 text-sm text-slate-950">筛选</button>
        </form>

        <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(anomalyLabels).map(([key, label]) => (
            <div key={key} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs leading-5 text-slate-400">{label}</div>
              <div className="mt-3 text-2xl">
                {anomalies.counts[key as keyof typeof anomalies.counts]}
              </div>
            </div>
          ))}
        </div>

        {anomalies.items.length > 0 ? <OrderAnomalyActions items={anomalies.items} /> : null}

        <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-white/10">
          <table className="min-w-full bg-white/5 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-4">级别</th>
                <th className="px-5 py-4">异常类型</th>
                <th className="px-5 py-4">订单</th>
                <th className="px-5 py-4">分销商</th>
                <th className="px-5 py-4">域名</th>
                <th className="px-5 py-4">订单状态</th>
                <th className="px-5 py-4">支付状态</th>
                <th className="px-5 py-4">创建时间</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.items.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={8}>
                    当前没有检测到符合筛选条件的异常订单。
                  </td>
                </tr>
              ) : (
                anomalies.items.map((item) => (
                  <tr
                    key={`${item.orderId}-${item.kind}`}
                    className="border-t border-white/10 align-top"
                  >
                    <td className="px-5 py-4">
                      <span
                        className={
                          item.severity === "high"
                            ? "rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs text-rose-100"
                            : "rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-100"
                        }
                      >
                        {item.severity === "high" ? "高" : "中"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div>{anomalyLabels[item.kind]}</div>
                      <div className="mt-2 text-xs text-slate-500">{item.summary}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div>{item.orderId}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.externalOrderId}</div>
                      <Link
                        href={`/admin/orders/${item.orderId}`}
                        className="mt-3 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-white"
                      >
                        查看详情
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div>{item.affiliateName}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.affiliateCode}</div>
                    </td>
                    <td className="px-5 py-4">{item.domain}</td>
                    <td className="px-5 py-4">{item.status}</td>
                    <td className="px-5 py-4">{item.paymentStatus}</td>
                    <td className="px-5 py-4">{item.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs leading-6 text-slate-500">
          异常视图基于最近订单和当前配置实时计算，用于帮助人工排查，不会直接改动订单状态。
        </p>
    </div>
  );
}
