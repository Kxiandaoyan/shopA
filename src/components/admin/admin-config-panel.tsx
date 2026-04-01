"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AffiliateSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  domainCount: number;
};

type DomainSummary = {
  id: string;
  hostname: string;
  label: string;
  isActive: boolean;
  affiliateIds: string[];
  affiliateNames: string;
  templateCode: string;
  stripeAccountId: string | null;
  stripeLabel: string | null;
  stripeActive: boolean;
};

type StripeAccountSummary = {
  id: string;
  accountLabel: string;
  isActive: boolean;
};

type AdminConfigPanelProps = {
  affiliates: AffiliateSummary[];
  domains: DomainSummary[];
  stripeAccounts?: StripeAccountSummary[];
};

type AffiliateFormState = {
  name: string;
  isActive: boolean;
  editMode: boolean;
};

type DomainFormState = {
  id?: string;
  hostname: string;
  label: string;
  affiliateIds: string[];
  templateCode: string;
  isActive: boolean;
  editMode: boolean;
};

const emptyAffiliateForm = (): AffiliateFormState => ({
  name: "",
  isActive: true,
  editMode: false,
});

const buildAffiliateForm = (affiliate: AffiliateSummary): AffiliateFormState => ({
  name: affiliate.name,
  isActive: affiliate.isActive,
  editMode: true,
});

const emptyDomainForm = (): DomainFormState => ({
  hostname: "",
  label: "",
  affiliateIds: [],
  templateCode: "",
  isActive: true,
  editMode: false,
});

const buildDomainForm = (domain: DomainSummary): DomainFormState => ({
  id: domain.id,
  hostname: domain.hostname,
  label: domain.label,
  affiliateIds: domain.affiliateIds,
  templateCode: domain.templateCode,
  isActive: domain.isActive,
  editMode: true,
});

async function requestJson(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  payload?: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  return response.json();
}

export function AdminConfigPanel({
  affiliates,
  domains,
  stripeAccounts = [],
}: AdminConfigPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"affiliates" | "domains">("affiliates");
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormState>(emptyAffiliateForm);
  const [domainForm, setDomainForm] = useState<DomainFormState>(emptyDomainForm);

  const handleSuccess = (nextMessage: string, reset: () => void) => {
    reset();
    setMessage(nextMessage);
    router.refresh();
  };

  const handleDeleteAffiliate = async (id: string) => {
    if (!confirm("确定删除该分销商？此操作不可恢复。\关联域名将取消分配。")) return;

    startTransition(async () => {
      const result = await requestJson(`/api/admin/affiliates?id=${id}`, "DELETE");

      if (result.ok) {
        handleSuccess("分销商已删除", () => {
          setSelectedAffiliateId("");
          setAffiliateForm(emptyAffiliateForm());
        });
      } else {
        setMessage(result.message ?? "删除失败");
      }
    });
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm("确定删除该域名？此操作不可恢复。")) return;

    startTransition(async () => {
      const result = await requestJson(`/api/admin/domains?id=${id}`, "DELETE");

      if (result.ok) {
        handleSuccess("域名已删除", () => {
          setSelectedDomainId("");
          setDomainForm(emptyDomainForm());
        });
      } else {
        setMessage(result.message ?? "删除失败");
      }
    });
  };

  const toggleAffiliate = (affiliateId: string) => {
    setDomainForm((current) => ({
      ...current,
      affiliateIds: current.affiliateIds.includes(affiliateId)
        ? current.affiliateIds.filter((id) => id !== affiliateId)
        : [...current.affiliateIds, affiliateId],
    }));
  };

  return (
    <section className="mt-10 space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-full bg-white/10 p-1">
        <button
          onClick={() => setActiveTab("affiliates")}
          className={`rounded-full px-4 py-2 text-sm ${
            activeTab === "affiliates" ? "bg-white text-slate-950" : "text-slate-400"
          }`}
        >
          分销商
        </button>
        <button
          onClick={() => setActiveTab("domains")}
          className={`rounded-full px-4 py-2 text-sm ${
            activeTab === "domains" ? "bg-white text-slate-950" : "text-slate-400"
          }`}
        >
          域名
        </button>
      </div>

      {/* Affiliates Tab */}
      {activeTab === "affiliates" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <form
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await requestJson(
                  "/api/admin/affiliates",
                  affiliateForm.editMode ? "PATCH" : "POST",
                  {
                    ...(affiliateForm.editMode ? { id: selectedAffiliateId } : {}),
                    name: affiliateForm.name,
                    isActive: affiliateForm.isActive,
                  },
                );

                if (result.ok) {
                  handleSuccess(
                    affiliateForm.editMode ? "分销商已更新" : "分销商已创建，系统已自动生成编码和密钥",
                    () => {
                      setSelectedAffiliateId("");
                      setAffiliateForm(emptyAffiliateForm());
                    },
                  );
                  return;
                }

                setMessage(result.message ?? "保存失败");
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg">
                {affiliateForm.editMode ? "编辑分销商" : "新增分销商"}
              </div>
              <select
                value={selectedAffiliateId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedAffiliateId(nextId);
                  const selected = affiliates.find((a) => a.id === nextId);
                  setAffiliateForm(selected ? buildAffiliateForm(selected) : emptyAffiliateForm());
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="">新建</option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id}>
                    {affiliate.name} ({affiliate.domainCount} 域名)
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={affiliateForm.name}
                onChange={(event) =>
                  setAffiliateForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="分销商名称"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />
              {affiliateForm.editMode && (
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={affiliateForm.isActive}
                    onChange={(event) =>
                      setAffiliateForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  启用该分销商
                </label>
              )}
              <div className="space-y-1 text-xs text-slate-400">
                <p>创建分销商时，系统会自动生成编码和密钥。</p>
                <p>分销商可在自己的后台查看和配置回跳地址和 Webhook。</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
                disabled={isPending || !affiliateForm.name}
              >
                {affiliateForm.editMode ? "保存修改" : "创建分销商"}
              </button>
              {affiliateForm.editMode && (
                <button
                  type="button"
                  onClick={() => handleDeleteAffiliate(selectedAffiliateId)}
                  className="rounded-full border border-rose-500/30 px-5 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                  disabled={isPending}
                >
                  删除分销商
                </button>
              )}
            </div>
          </form>

          {/* List */}
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <div className="text-lg">分销商列表</div>
            <div className="mt-4 space-y-3">
              {affiliates.length === 0 ? (
                <div className="text-slate-400">暂无分销商数据。</div>
              ) : (
                affiliates.map((affiliate) => (
                  <div key={affiliate.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{affiliate.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {affiliate.code} · {affiliate.domainCount} 域名
                        </div>
                      </div>
                      <div className={`text-xs ${affiliate.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                        {affiliate.isActive ? "启用中" : "已停用"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Domains Tab */}
      {activeTab === "domains" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Form */}
          <form
            className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await requestJson(
                  "/api/admin/domains",
                  domainForm.editMode ? "PATCH" : "POST",
                  {
                    ...(domainForm.editMode ? { id: domainForm.id } : {}),
                    hostname: domainForm.hostname,
                    label: domainForm.label,
                    affiliateIds: domainForm.affiliateIds,
                    templateCode: domainForm.templateCode || null,
                    isActive: domainForm.isActive,
                  },
                );

                if (result.ok) {
                  handleSuccess(
                    domainForm.editMode ? "域名已更新" : "域名已创建",
                    () => {
                      setSelectedDomainId("");
                      setDomainForm(emptyDomainForm());
                    },
                  );
                  return;
                }

                setMessage(result.message ?? "保存失败");
              });
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg">{domainForm.editMode ? "编辑域名" : "新增域名"}</div>
              <select
                value={selectedDomainId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedDomainId(nextId);
                  const selected = domains.find((d) => d.id === nextId);
                  setDomainForm(selected ? buildDomainForm(selected) : emptyDomainForm());
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="">新建</option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.hostname}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={domainForm.hostname}
                onChange={(event) =>
                  setDomainForm((current) => ({ ...current, hostname: event.target.value }))
                }
                placeholder="pay.example.com"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />
              <input
                value={domainForm.label}
                onChange={(event) =>
                  setDomainForm((current) => ({ ...current, label: event.target.value }))
                }
                placeholder="域名标签 (自定义名称)"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />

              {/* 多选分销商 */}
              <div className="rounded-xl bg-white/10 p-3">
                <div className="text-sm text-slate-400 mb-2">分配分销商 (可多选)</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {affiliates.length === 0 ? (
                    <div className="text-xs text-slate-500">暂无可用的分销商</div>
                  ) : (
                    affiliates.map((affiliate) => (
                      <label key={affiliate.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={domainForm.affiliateIds.includes(affiliate.id)}
                          onChange={() => toggleAffiliate(affiliate.id)}
                        />
                        <span>{affiliate.name}</span>
                        {!affiliate.isActive && (
                          <span className="text-xs text-slate-500">(已停用)</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {domainForm.affiliateIds.length > 0 && (
                  <div className="mt-2 text-xs text-emerald-400">
                    已选择 {domainForm.affiliateIds.length} 个分销商
                  </div>
                )}
              </div>

              <select
                value={domainForm.templateCode}
                onChange={(event) =>
                  setDomainForm((current) => ({
                    ...current,
                    templateCode: event.target.value as DomainFormState["templateCode"],
                  }))
                }
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              >
                <option value="">默认模板</option>
                <option value="A">模板 A</option>
                <option value="B">模板 B</option>
                <option value="C">模板 C</option>
              </select>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={domainForm.isActive}
                  onChange={(event) =>
                    setDomainForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                启用该域名
              </label>
              <div className="space-y-1 text-xs text-slate-400">
                <p>• Stripe 账号绑定请前往「Stripe 管理」页面操作</p>
                <p>• 在 Stripe 管理页创建账号时选择绑定此域名，即可自动关联</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
                disabled={isPending || !domainForm.hostname}
              >
                {domainForm.editMode ? "保存修改" : "创建域名"}
              </button>
              {domainForm.editMode && (
                <button
                  type="button"
                  onClick={() => handleDeleteDomain(selectedDomainId)}
                  className="rounded-full border border-rose-500/30 px-5 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                  disabled={isPending}
                >
                  删除域名
                </button>
              )}
            </div>
          </form>

          {/* List */}
          <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
            <div className="text-lg">域名列表</div>
            <div className="mt-4 space-y-3">
              {domains.length === 0 ? (
                <div className="text-slate-400">暂无域名数据。</div>
              ) : (
                domains.map((domain) => (
                  <div key={domain.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{domain.hostname}</div>
                        <div className="mt-1 text-xs text-slate-500">{domain.label}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          分销商: {domain.affiliateNames}
                        </div>
                        {domain.stripeLabel ? (
                          <div className="mt-1 text-xs text-emerald-500">
                            Stripe: {domain.stripeLabel} {domain.stripeActive ? "" : "(已停用)"}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-slate-500">
                            Stripe: 未绑定
                          </div>
                        )}
                      </div>
                      <div className={`text-xs ${domain.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                        {domain.isActive ? "启用中" : "已停用"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}
    </section>
  );
}
