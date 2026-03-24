import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { AffiliateIntegrationPanel } from "@/components/affiliate/integration-panel";
import { requireAffiliateAdmin } from "@/lib/auth/access";
import { loadAffiliateDetails, loadAdminStripeAccountSummaries } from "@/lib/admin/dashboard";

export default async function AffiliatePage() {
  const session = await requireAffiliateAdmin();
  const affiliateId = session.affiliateIds[0];

  if (!affiliateId) {
    return (
      <main className="min-h-screen bg-stone-100 px-8 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p>您尚未关联任何分销商。</p>
        </div>
      </main>
    );
  }

  const [affiliate, stripeAccounts] = await Promise.all([
    loadAffiliateDetails(affiliateId),
    loadAdminStripeAccountSummaries(),
  ]);

  if (!affiliate) {
    return (
      <main className="min-h-screen bg-stone-100 px-8 py-10 text-slate-900">
        <div className="mx-auto max-w-6xl">
          <p>分销商信息加载失败。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">分销商后台</div>
            <h1 className="mt-3 text-3xl">{affiliate.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {session.displayName} / {session.email}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Link
            href="/affiliate/orders"
            className="rounded-[1.6rem] border border-slate-200 bg-white p-6 transition hover:border-slate-300"
          >
            <div className="text-lg">查看订单</div>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              查看所有订单状态、支付结果和详情。
            </p>
          </Link>

          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
            <div className="text-lg">已分配域名</div>
            <div className="mt-3 text-2xl font-semibold">{affiliate.domains.length}</div>
            <div className="mt-2 text-sm text-slate-600">
              {affiliate.domains.map((d) => d.hostname).join(", ") || "暂无"}
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
            <div className="text-lg">对接配置</div>
            <div className="mt-3 text-sm text-slate-600">
              分销商编码: <code className="bg-slate-100 px-1 rounded">{affiliate.code}</code>
            </div>
          </div>
        </div>

        <AffiliateIntegrationPanel
          affiliate={affiliate}
          stripeAccounts={stripeAccounts}
        />
      </div>
    </main>
  );
}
