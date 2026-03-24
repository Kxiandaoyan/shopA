import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import {
  loadAdminAffiliateSummaries,
  loadAdminDomainSummaries,
  loadAdminStripeAccountSummaries,
} from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminDomainsPage() {
  await requireSuperAdmin();

  const [affiliates, domains, stripeAccounts] = await Promise.all([
    loadAdminAffiliateSummaries(),
    loadAdminDomainSummaries(),
    loadAdminStripeAccountSummaries(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">域名配置</div>
          <h1 className="mt-3 text-3xl">落地域名、模板与 Stripe 绑定</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            在这里添加和管理落地域名。创建域名后，可以分配给分销商并绑定 Stripe 账号。
          </p>
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
              <th className="px-5 py-4">Stripe 账号</th>
              <th className="px-5 py-4">状态</th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td className="px-5 py-6 text-slate-400" colSpan={7}>
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
                    {domain.stripeLabel
                      ? `${domain.stripeLabel} / ${domain.stripeActive ? "已启用" : "未启用"}`
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
        stripeAccounts={stripeAccounts}
      />
    </div>
  );
}
