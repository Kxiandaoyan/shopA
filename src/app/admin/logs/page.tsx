import Link from "next/link";
import { loadAdminLogStats, loadAdminLogSummaries } from "@/lib/admin/dashboard";
import { normalizeAdminLogFilters } from "@/lib/admin/log-filters";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

type AdminLogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildSearch(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string | undefined> = {},
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      search.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (!value) {
      search.delete(key);
      continue;
    }

    search.set(key, value);
  }

  return search.toString();
}

function buildPageHref(
  params: Record<string, string | string[] | undefined>,
  page: number,
) {
  return `/admin/logs?${buildSearch(params, { page: page.toString() })}`;
}

function buildExportHref(params: Record<string, string | string[] | undefined>) {
  const query = buildSearch(params, { page: undefined });
  return query ? `/api/admin/logs/export?${query}` : "/api/admin/logs/export";
}

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  await requireSuperAdmin();
  const params = await searchParams;
  const page = Math.max(
    1,
    typeof params.page === "string" ? Number.parseInt(params.page, 10) || 1 : 1,
  );
  const filters = normalizeAdminLogFilters({
    eventType: typeof params.eventType === "string" ? params.eventType : undefined,
    result: typeof params.result === "string" ? params.result : undefined,
    query: typeof params.q === "string" ? params.q : undefined,
    orderId: typeof params.orderId === "string" ? params.orderId : undefined,
    domain: typeof params.domain === "string" ? params.domain : undefined,
  });
  const [logs, stats] = await Promise.all([
    loadAdminLogSummaries(filters, { page, pageSize: 30 }),
    loadAdminLogStats(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">系统日志</div>
            <h1 className="mt-3 text-3xl">详细链路日志</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              支持按事件类型、结果、订单号、域名和关键字筛选，用于排查接单、二跳、Stripe
              回调与回跳分销站问题。
            </p>
          </div>
          <Link
            href={buildExportHref(params)}
            className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-100"
          >
            导出当前筛选 CSV
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-slate-400">日志总量</div>
            <div className="mt-2 text-2xl">{stats.total}</div>
          </div>
          <div className="rounded-[1.4rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-xs text-emerald-200">成功事件</div>
            <div className="mt-2 text-2xl">{stats.successes}</div>
          </div>
          <div className="rounded-[1.4rem] border border-rose-500/20 bg-rose-500/10 p-4">
            <div className="text-xs text-rose-200">失败事件</div>
            <div className="mt-2 text-2xl">{stats.failures}</div>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[1fr_1fr_1fr_1fr_1.1fr_auto]">
          <input
            name="eventType"
            placeholder="事件类型"
            defaultValue={filters.eventType ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <select
            name="result"
            defaultValue={filters.result ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          >
            <option value="">全部结果</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="INFO">INFO</option>
          </select>
          <input
            name="orderId"
            placeholder="订单号"
            defaultValue={filters.orderId ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="domain"
            placeholder="域名包含"
            defaultValue={filters.domain ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <input
            name="q"
            placeholder="关键字 / 状态 / 报错"
            defaultValue={filters.query ?? ""}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          />
          <button className="rounded-full bg-white px-5 py-3 text-sm text-slate-950">筛选</button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <div>
            第 {logs.page} / {logs.totalPages} 页，共 {logs.total} 条
          </div>
          <div className="flex gap-3">
            {logs.page > 1 ? (
              <Link
                href={buildPageHref(params, logs.page - 1)}
                className="rounded-full border border-white/10 px-4 py-2 text-white"
              >
                上一页
              </Link>
            ) : null}
            {logs.page < logs.totalPages ? (
              <Link
                href={buildPageHref(params, logs.page + 1)}
                className="rounded-full border border-white/10 px-4 py-2 text-white"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {logs.items.length === 0 ? (
            <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 text-slate-400">
              暂无符合筛选条件的日志数据。
            </div>
          ) : (
            logs.items.map((log) => (
              <article
                key={log.id}
                className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-300">{log.eventType}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {log.createdAt.toISOString()}
                    </div>
                  </div>
                  <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                    {log.result}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                  <div>订单：{log.order?.id ?? "N/A"}</div>
                  <div>域名：{log.landingDomain?.hostname ?? "N/A"}</div>
                  <div>状态：{log.status ?? "N/A"}</div>
                </div>
                {log.requestUrl ? (
                  <div className="mt-4 text-sm text-slate-400">请求地址：{log.requestUrl}</div>
                ) : null}
                {log.message ? <p className="mt-3 text-sm text-slate-400">{log.message}</p> : null}
                {log.metadata ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                ) : null}
              </article>
            ))
          )}
        </div>

      <p className="mt-6 text-xs leading-6 text-slate-500">
        导出会保留当前筛选条件，最多导出最近 5000 条匹配日志。
      </p>
    </div>
  );
}
