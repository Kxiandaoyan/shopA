import { StripeManagementPanel } from "@/components/admin/stripe-management-panel";
import { loadAdminStripeAccountSummaries } from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminStripePage() {
  await requireSuperAdmin();
  const accounts = await loadAdminStripeAccountSummaries();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Stripe 账号管理</div>
      <h1 className="mt-3 text-3xl">管理 Stripe 支付账号</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        添加和管理 Stripe 支付账号。创建后，在域名管理中给域名分配 Stripe 账号即可启用支付功能。
      </p>

      <div className="mt-8">
        <StripeManagementPanel accounts={accounts} />
      </div>
    </div>
  );
}
