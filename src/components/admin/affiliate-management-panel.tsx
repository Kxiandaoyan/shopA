"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type AffiliateSummary = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  domainCount: number;
  domainHostnames: string[];
};

type AvailableDomain = {
  id: string;
  hostname: string;
  label: string;
};

type AffiliateManagementPanelProps = {
  affiliates: AffiliateSummary[];
  availableDomains: AvailableDomain[];
};

type AffiliateFormState = {
  name: string;
  email: string;
  password: string;
  displayName: string;
  selectedDomainId: string;
  isActive: boolean;
  editMode: boolean;
};

const emptyAffiliateForm = (): AffiliateFormState => ({
  name: "",
  email: "",
  password: "",
  displayName: "",
  selectedDomainId: "",
  isActive: true,
  editMode: false,
});

const buildAffiliateForm = (affiliate: AffiliateSummary): AffiliateFormState => ({
  name: affiliate.name,
  email: "",
  password: "",
  displayName: "",
  selectedDomainId: "",
  isActive: affiliate.isActive,
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

export function AffiliateManagementPanel({
  affiliates,
  availableDomains,
}: AffiliateManagementPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("");
  const [affiliateForm, setAffiliateForm] = useState<AffiliateFormState>(emptyAffiliateForm);

  const handleSuccess = (msg: string, reset: () => void) => {
    reset();
    setMessage(msg);
    router.refresh();
  };

  const handleDeleteAffiliate = async (id: string) => {
    if (!confirm("确定删除该分销商？此操作不可恢复。\n\n关联的用户账号和域名分配也会被移除。"))
      return;

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
                ...(affiliateForm.editMode ? { id: selectedAffiliateId } : {}),
                name: affiliateForm.name,
                isActive: affiliateForm.isActive,
                // 创建时需要的额外字段
                ...(affiliateForm.editMode
                  ? {}
                  : {
                      email: affiliateForm.email,
                      password: affiliateForm.password,
                      displayName: affiliateForm.displayName || affiliateForm.name,
                      domainId: affiliateForm.selectedDomainId || null,
                    }),
              },
            );

            if (result.ok) {
              handleSuccess(
                affiliateForm.editMode
                  ? "分销商已更新"
                  : "分销商已创建，系统已自动生成编码和密钥，并创建登录账号",
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
          <div className="text-lg">{affiliateForm.editMode ? "编辑分销商" : "新增分销商"}</div>
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
          {!affiliateForm.editMode && (
            <>
              <input
                value={affiliateForm.email}
                onChange={(event) =>
                  setAffiliateForm((current) => ({ ...current, email: event.target.value }))
                }
                type="email"
                placeholder="登录邮箱"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />
              <input
                value={affiliateForm.password}
                onChange={(event) =>
                  setAffiliateForm((current) => ({ ...current, password: event.target.value }))
                }
                type="password"
                placeholder="登录密码"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />
              <input
                value={affiliateForm.displayName}
                onChange={(event) =>
                  setAffiliateForm((current) => ({ ...current, displayName: event.target.value }))
                }
                placeholder="显示名称 (可选，默认使用分销商名称)"
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              />
              <select
                value={affiliateForm.selectedDomainId}
                onChange={(event) =>
                  setAffiliateForm((current) => ({ ...current, selectedDomainId: event.target.value }))
                }
                className="rounded-xl bg-white/10 px-4 py-3 outline-none"
              >
                <option value="">自动分配可用域名</option>
                {availableDomains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.hostname} ({domain.label})
                  </option>
                ))}
              </select>
            </>
          )}
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
            {!affiliateForm.editMode && (
              <p>如果不选择域名，系统会自动分配一个可用的域名。</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending || !affiliateForm.name || (!affiliateForm.editMode && (!affiliateForm.email || !affiliateForm.password))}
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

      {/* List Section */}
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
                    {affiliate.domainHostnames.length > 0 && (
                      <div className="mt-1 text-xs text-slate-400">
                        {affiliate.domainHostnames.join(", ")}
                      </div>
                    )}
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

      {/* Message */}
      {message && (
        <div className="lg:col-span-2 rounded-[1.6rem] border border-white/10 bg-white/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}
    </div>
  );
}
