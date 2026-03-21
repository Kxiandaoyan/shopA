"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AffiliateSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  domainCount: number;
  returnUrlCount: number;
};

type DomainSummary = {
  id: string;
  hostname: string;
  label: string;
  isActive: boolean;
  affiliateId: string | null;
  affiliateName: string;
  templateCode: "A" | "B" | "C";
  stripeLabel: string;
  stripeActive: boolean;
};

type ReturnUrlSummary = {
  id: string;
  affiliateName: string;
  affiliateId: string;
  url: string;
  isActive: boolean;
};

type AdminConfigPanelProps = {
  affiliates: AffiliateSummary[];
  domains: DomainSummary[];
  returnUrls: ReturnUrlSummary[];
};

type AffiliateFormState = {
  code: string;
  name: string;
  intakeSecret: string;
  callbackSecret: string;
  isActive: boolean;
  editMode: boolean;
};

type DomainFormState = {
  id?: string;
  hostname: string;
  label: string;
  affiliateId: string;
  templateCode: string;
  isActive: boolean;
  editMode: boolean;
};

type ReturnUrlFormState = {
  id?: string;
  affiliateId: string;
  url: string;
  isActive: boolean;
  editMode: boolean;
};

const emptyAffiliateForm = (): AffiliateFormState => ({
  code: "",
  name: "",
  intakeSecret: "",
  callbackSecret: "",
  isActive: true,
  editMode: false,
});

const buildAffiliateForm = (affiliate: AffiliateSummary): AffiliateFormState => ({
  code: affiliate.code,
  name: affiliate.name,
  intakeSecret: "",
  callbackSecret: "",
  isActive: affiliate.isActive,
  editMode: true,
});

const emptyDomainForm = (): DomainFormState => ({
  hostname: "",
  label: "",
  affiliateId: "",
  templateCode: "",
  isActive: true,
  editMode: false,
});

const buildDomainForm = (domain: DomainSummary): DomainFormState => ({
  id: domain.id,
  hostname: domain.hostname,
  label: domain.label,
  affiliateId: domain.affiliateId ?? "",
  templateCode: domain.templateCode,
  isActive: domain.isActive,
  editMode: true,
});

const buildEmptyReturnUrlForm = (defaultAffiliateId: string): ReturnUrlFormState => ({
  affiliateId: defaultAffiliateId,
  url: "",
  isActive: true,
  editMode: false,
});

const buildReturnUrlForm = (entry: ReturnUrlSummary): ReturnUrlFormState => ({
  id: entry.id,
  affiliateId: entry.affiliateId,
  url: entry.url,
  isActive: entry.isActive,
  editMode: true,
});

async function requestJson(
  url: string,
  method: "POST" | "PATCH",
  payload: Record<string, unknown>,
) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

export function AdminConfigPanel({
  affiliates,
  domains,
  returnUrls,
}: AdminConfigPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedAffiliateCode, setSelectedAffiliateCode] = useState("");
  const [selectedDomainId, setSelectedDomainId] = useState("");
  const [selectedReturnUrlId, setSelectedReturnUrlId] = useState("");
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormState>(emptyAffiliateForm);
  const [domainForm, setDomainForm] = useState<DomainFormState>(emptyDomainForm);
  const [returnUrlForm, setReturnUrlForm] = useState<ReturnUrlFormState>(() =>
    buildEmptyReturnUrlForm(affiliates[0]?.id ?? ""),
  );

  const defaultAffiliateId = affiliates[0]?.id ?? "";
  const handleSuccess = (nextMessage: string, reset: () => void) => {
    reset();
    setMessage(nextMessage);
    router.refresh();
  };

  return (
    <section className="mt-10 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await requestJson(
                "/api/admin/affiliates",
                affiliateForm.editMode ? "PATCH" : "POST",
                {
                  code: affiliateForm.code,
                  name: affiliateForm.name,
                  intakeSecret: affiliateForm.intakeSecret,
                  callbackSecret: affiliateForm.callbackSecret,
                  ...(affiliateForm.editMode ? { isActive: affiliateForm.isActive } : {}),
                },
              );

              if (result.ok) {
                handleSuccess(
                  affiliateForm.editMode ? "分销商已更新，列表已刷新。" : "分销商已创建，列表已刷新。",
                  () => {
                    setSelectedAffiliateCode("");
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
            <div className="text-lg">{affiliateForm.editMode ? "编辑分销商" : "新增分销商"}</div>
            <select
              value={selectedAffiliateCode}
              onChange={(event) => {
                const nextCode = event.target.value;
                setSelectedAffiliateCode(nextCode);
                const selected = affiliates.find((affiliate) => affiliate.code === nextCode);
                setAffiliateForm(selected ? buildAffiliateForm(selected) : emptyAffiliateForm());
              }}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
            >
              <option value="">新建</option>
              {affiliates.map((affiliate) => (
                <option key={affiliate.id} value={affiliate.code}>
                  {affiliate.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid gap-3">
            <input
              value={affiliateForm.code}
              onChange={(event) =>
                setAffiliateForm((current) => ({ ...current, code: event.target.value }))
              }
              placeholder="分销商编码"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              value={affiliateForm.name}
              onChange={(event) =>
                setAffiliateForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="分销商名称"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              value={affiliateForm.intakeSecret}
              onChange={(event) =>
                setAffiliateForm((current) => ({
                  ...current,
                  intakeSecret: event.target.value,
                }))
              }
              placeholder={affiliateForm.editMode ? "输入新接单密钥以轮换" : "接单签名密钥"}
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              value={affiliateForm.callbackSecret}
              onChange={(event) =>
                setAffiliateForm((current) => ({
                  ...current,
                  callbackSecret: event.target.value,
                }))
              }
              placeholder={affiliateForm.editMode ? "输入新回跳密钥以轮换" : "回跳签名密钥"}
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            {affiliateForm.editMode ? (
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
            ) : null}
            <div className="space-y-2 text-xs text-slate-400">
              <p>接单签名密钥用于校验分销商发来的 intake API 请求，必须每个分销商独立配置。</p>
              <p>回跳签名密钥用于保护支付完成后的回跳参数，降低被伪造成功状态的风险。</p>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending}
          >
            {affiliateForm.editMode ? "保存修改" : "创建分销商"}
          </button>
        </form>

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
                  affiliateId: domainForm.affiliateId || null,
                  templateCode: domainForm.templateCode || null,
                  isActive: domainForm.isActive,
                },
              );

              if (result.ok) {
                handleSuccess(
                  domainForm.editMode ? "域名已更新，列表已刷新。" : "域名已创建，列表已刷新。",
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
            <div className="text-lg">{domainForm.editMode ? "编辑域名" : "新增域名 / 模板"}</div>
            <select
              value={selectedDomainId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedDomainId(nextId);
                const selected = domains.find((domain) => domain.id === nextId);
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
              placeholder="pay-a.example.com"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              value={domainForm.label}
              onChange={(event) =>
                setDomainForm((current) => ({ ...current, label: event.target.value }))
              }
              placeholder="域名标签"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <select
              value={domainForm.affiliateId}
              onChange={(event) =>
                setDomainForm((current) => ({ ...current, affiliateId: event.target.value }))
              }
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            >
              <option value="">暂不分配分销商</option>
              {affiliates.map((affiliate) => (
                <option key={affiliate.id} value={affiliate.id}>
                  {affiliate.name} ({affiliate.code})
                </option>
              ))}
            </select>
            <select
              value={domainForm.templateCode}
              onChange={(event) =>
                setDomainForm((current) => ({ ...current, templateCode: event.target.value }))
              }
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            >
              <option value="">默认 A 模板</option>
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
          </div>

          <button
            type="submit"
            className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending}
          >
            {domainForm.editMode ? "保存修改" : "创建域名"}
          </button>
        </form>

        <form
          className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await requestJson(
                "/api/admin/return-urls",
                returnUrlForm.editMode ? "PATCH" : "POST",
                {
                  ...(returnUrlForm.editMode ? { id: returnUrlForm.id } : {}),
                  affiliateId: returnUrlForm.affiliateId,
                  url: returnUrlForm.url,
                  isActive: returnUrlForm.isActive,
                },
              );

              if (result.ok) {
                handleSuccess(
                  returnUrlForm.editMode
                    ? "回跳地址已更新，列表已刷新。"
                    : "回跳地址已创建，列表已刷新。",
                  () => {
                    setSelectedReturnUrlId("");
                    setReturnUrlForm(buildEmptyReturnUrlForm(defaultAffiliateId));
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
              {returnUrlForm.editMode ? "编辑回跳地址" : "新增回跳白名单"}
            </div>
            <select
              value={selectedReturnUrlId}
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedReturnUrlId(nextId);
                const selected = returnUrls.find((entry) => entry.id === nextId);
                setReturnUrlForm(
                  selected ? buildReturnUrlForm(selected) : buildEmptyReturnUrlForm(defaultAffiliateId),
                );
              }}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
            >
              <option value="">新建</option>
              {returnUrls.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.affiliateName}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid gap-3">
            <select
              value={returnUrlForm.affiliateId}
              onChange={(event) =>
                setReturnUrlForm((current) => ({ ...current, affiliateId: event.target.value }))
              }
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            >
              {affiliates.map((affiliate) => (
                <option key={affiliate.id} value={affiliate.id}>
                  {affiliate.name} ({affiliate.code})
                </option>
              ))}
            </select>
            <input
              value={returnUrlForm.url}
              onChange={(event) =>
                setReturnUrlForm((current) => ({ ...current, url: event.target.value }))
              }
              placeholder="https://aaa.com/complete"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={returnUrlForm.isActive}
                onChange={(event) =>
                  setReturnUrlForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              启用该回跳地址
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending}
          >
            {returnUrlForm.editMode ? "保存修改" : "创建回跳地址"}
          </button>
        </form>

        <form
          className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const formData = new FormData(formElement);
            startTransition(async () => {
              const result = await requestJson("/api/admin/stripe", "POST", {
                landingDomainId: formData.get("landingDomainId"),
                accountLabel: formData.get("accountLabel"),
                publishableKey: formData.get("publishableKey") || null,
                secretKey: formData.get("secretKey"),
                webhookSecret: formData.get("webhookSecret"),
                isActive: formData.get("isActive") === "on",
              });

              if (result.ok) {
                handleSuccess("Stripe 绑定已保存，列表已刷新。", () => {
                  formElement.reset();
                });
                return;
              }

              setMessage(result.message ?? "保存失败");
            });
          }}
        >
          <div className="text-lg">绑定 Stripe 账号</div>
          <div className="mt-4 grid gap-3">
            <select
              name="landingDomainId"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.hostname} / {domain.label}
                </option>
              ))}
            </select>
            <input
              name="accountLabel"
              placeholder="Stripe 账号标签"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              name="publishableKey"
              placeholder="Publishable Key（可选）"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              name="secretKey"
              placeholder="Secret Key"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              name="webhookSecret"
              placeholder="Webhook Secret"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input type="checkbox" name="isActive" defaultChecked />
              启用该 Stripe 绑定
            </label>
          </div>

          <button
            type="submit"
            className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending}
          >
            保存 Stripe 配置
          </button>
        </form>
      </div>

      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6 text-sm text-emerald-300">
        {message || "建议每个分销商同时配置接单密钥和回跳签名密钥，并为每个支付域名单独绑定 Stripe 账号。"}
      </div>
    </section>
  );
}
