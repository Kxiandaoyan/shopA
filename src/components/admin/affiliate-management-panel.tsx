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
  webhookEndpointCount: number;
};

type AffiliateManagementPanelProps = {
  affiliates: AffiliateSummary[];
};

type AffiliateFormState = {
  name: string;
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

export function AffiliateManagementPanel({
  affiliates,
}: AffiliateManagementPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormState>(emptyAffiliateForm);

  const handleSuccess = (nextMessage: string, reset: () => void) => {
    reset();
    setMessage(nextMessage);
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form Section */}
      <form
        className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await requestJson(
              "/api/admin/affiliates",
              affiliateForm.editMode ? "PATCH" : "POST",
              {
                ...(affiliateForm.editMode
                  ? { id: selectedAffiliateId, isActive: affiliateForm.isActive }
                  : { name: affiliateForm.name }),
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
                {affiliate.name}
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
            <p>创建分销商时，系统会自动生成唯一的编码和密钥，分销商可在自己的后台查看密钥。</p>
          </div>
        </div>

        <button
          type="submit"
          className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
          disabled={isPending || !affiliateForm.name}
        >
          {affiliateForm.editMode ? "保存修改" : "创建分销商"}
        </button>
      </form>

      {/* List Section */}
      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
        <div className="text-lg">分销商列表</div>
        <div className="mt-4 space-y-3">
          {affiliates.length === 0 ? (
            <div className="text-slate-400">暂无分销商数据。</div>
          ) : (
            affiliates.map((affiliate) => (
              <div
                key={affiliate.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{affiliate.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{affiliate.code}</div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs ${
                      affiliate.isActive
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {affiliate.isActive ? "启用中" : "已停用"}
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-slate-400">
                  <span>{affiliate.domainCount} 域名</span>
                  <span>{affiliate.returnUrlCount} 回跳地址</span>
                  <span>{affiliate.webhookEndpointCount} Webhook</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="lg:col-span-2 rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}
    </div>
  );
}
