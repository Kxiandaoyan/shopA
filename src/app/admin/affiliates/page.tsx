import { AffiliateManagementPanel } from "@/components/admin/affiliate-management-panel";
import {
  loadAdminAffiliateSummaries,
  loadAvailableDomainsForAffiliate,
} from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminAffiliatesPage() {
  await requireSuperAdmin();

  const [affiliates, availableDomains] = await Promise.all([
    loadAdminAffiliateSummaries(),
    loadAvailableDomainsForAffiliate(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Affiliates</div>
      <h1 className="mt-3 text-3xl">分销商管理</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        创建分销商时会同时创建登录账号。只需填写名称、邮箱和密码，系统会自动生成编码和密钥，并分配可用域名。
      </p>

      <div className="mt-8">
        <AffiliateManagementPanel
          affiliates={affiliates}
          availableDomains={availableDomains}
        />
      </div>
    </div>
  );
}
