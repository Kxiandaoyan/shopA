import { AffiliateManagementPanel } from "@/components/admin/affiliate-management-panel";
import { loadAdminAffiliateSummaries } from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  await requireSuperAdmin();
  const affiliates = await loadAdminAffiliateSummaries();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Affiliates</div>
      <h1 className="mt-3 text-3xl">分销商管理</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        管理分销商账户、接单密钥、回跳密钥配置，以及启用/停用状态。
      </p>

      <div className="mt-8">
        <AffiliateManagementPanel affiliates={affiliates} />
      </div>
    </div>
  );
}
