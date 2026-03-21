import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import {
  loadAdminAffiliateSummaries,
  loadAdminDomainSummaries,
  loadAdminReturnUrlSummaries,
  loadAdminUserSummaries,
  loadAdminWebhookEndpointSummaries,
} from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  await requireSuperAdmin();
  const affiliates = await loadAdminAffiliateSummaries();
  const domains = await loadAdminDomainSummaries();
  const returnUrls = await loadAdminReturnUrlSummaries();
  const webhookEndpoints = await loadAdminWebhookEndpointSummaries();
  const users = await loadAdminUserSummaries();

  return (
    <main className="min-h-screen bg-slate-950 px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">域名配置</div>
            <h1 className="mt-3 text-3xl">落地域名、模板与 Stripe 绑定</h1>
          </div>
          <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
            未设置模板时默认使用 A 模板
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[1.6rem] border border-white/10">
          <table className="min-w-full bg-white/5 text-left text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <th className="px-5 py-4">域名</th>
                <th className="px-5 py-4">标签</th>
                <th className="px-5 py-4">所属分销商</th>
                <th className="px-5 py-4">模板</th>
                <th className="px-5 py-4">Stripe 名称策略</th>
                <th className="px-5 py-4">Stripe</th>
                <th className="px-5 py-4">Webhook</th>
                <th className="px-5 py-4">状态</th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-slate-400" colSpan={8}>
                    暂无域名数据。
                  </td>
                </tr>
              ) : (
                domains.map((domain) => (
                  <tr key={domain.id} className="border-t border-white/10">
                    <td className="px-5 py-4">{domain.hostname}</td>
                    <td className="px-5 py-4">{domain.label}</td>
                    <td className="px-5 py-4">{domain.affiliateName}</td>
                    <td className="px-5 py-4">{domain.templateCode}</td>
                    <td className="px-5 py-4">
                      {domain.affiliateCheckoutNameMode === "FIXED"
                        ? `固定: ${domain.affiliateCheckoutFixedName ?? "未设置"}`
                        : domain.affiliateCheckoutNameMode === "SOURCE_PRODUCT"
                          ? "来源真实商品名"
                          : "随机本站商品名"}
                    </td>
                    <td className="px-5 py-4">
                      {domain.stripeLabel} / {domain.stripeActive ? "已启用" : "未启用"}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {"stripeWebhookPath" in domain && domain.stripeWebhookPath
                        ? domain.stripeWebhookPath
                        : "未配置"}
                    </td>
                    <td className="px-5 py-4">{domain.isActive ? "启用中" : "已停用"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminConfigPanel
          affiliates={affiliates}
          domains={domains}
          returnUrls={returnUrls}
          webhookEndpoints={webhookEndpoints}
        />
        <UserManagementPanel affiliates={affiliates} users={users} />
      </div>
    </main>
  );
}
