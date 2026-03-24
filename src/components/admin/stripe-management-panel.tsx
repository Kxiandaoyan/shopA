"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type StripeAccountSummary = {
  id: string;
  accountLabel: string;
  isActive: boolean;
  webhookPath: string;
  domainCount: number;
  domains: Array<{ id: string; hostname: string; label: string }>;
  createdAt: string;
};

type StripeManagementPanelProps = {
  accounts: StripeAccountSummary[];
};

type StripeFormState = {
  id?: string;
  accountLabel: string;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
  editMode: boolean;
};

const emptyForm = (): StripeFormState => ({
  accountLabel: "",
  publishableKey: "",
  secretKey: "",
  webhookSecret: "",
  isActive: true,
  editMode: false,
});

const buildForm = (account: StripeAccountSummary): StripeFormState => ({
  id: account.id,
  accountLabel: account.accountLabel,
  publishableKey: "",
  secretKey: "",
  webhookSecret: "",
  isActive: account.isActive,
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

export function StripeManagementPanel({ accounts }: StripeManagementPanelProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<StripeFormState>(emptyForm);

  const handleSuccess = (msg: string, reset: () => void) => {
    reset();
    setMessage(msg);
    router.refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("确定删除该 Stripe 账号吗？此操作不可恢复。")) return;
    startTransition(async () => {
      const result = await requestJson(`/api/admin/stripe?id=${id}`, "DELETE");
      if (result.ok) {
        handleSuccess("Stripe 账号已删除", () => {
          setSelectedId("");
          setForm(emptyForm());
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
              "/api/admin/stripe",
              form.editMode ? "PATCH" : "POST",
              {
                ...(form.editMode ? { id: form.id } : {}),
                accountLabel: form.accountLabel,
                publishableKey: form.publishableKey || null,
                secretKey: form.secretKey,
                webhookSecret: form.webhookSecret,
                isActive: form.isActive,
              },
            );

            if (result.ok) {
              handleSuccess(
                form.editMode ? "Stripe 账号已更新" : "Stripe 账号已创建",
                () => {
                  setSelectedId("");
                  setForm(emptyForm());
                },
              );
              return;
            }

            setMessage(result.message ?? "保存失败");
          });
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg">{form.editMode ? "编辑 Stripe 账号" : "新增 Stripe 账号"}</div>
          <select
            value={selectedId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedId(nextId);
              const selected = accounts.find((a) => a.id === nextId);
              setForm(selected ? buildForm(selected) : emptyForm());
            }}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
          >
            <option value="">新建</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.accountLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            value={form.accountLabel}
            onChange={(event) =>
              setForm((current) => ({ ...current, accountLabel: event.target.value }))
            }
            placeholder="账号标签 (如: 主账号、备用账号)"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            value={form.publishableKey}
            onChange={(event) =>
              setForm((current) => ({ ...current, publishableKey: event.target.value }))
            }
            placeholder="Publishable Key (可选)"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            value={form.secretKey}
            onChange={(event) =>
              setForm((current) => ({ ...current, secretKey: event.target.value }))
            }
            placeholder={form.editMode ? "输入新 Secret Key 以轮换 (留空则不修改)" : "Secret Key (sk_...)"}
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            value={form.webhookSecret}
            onChange={(event) =>
              setForm((current) => ({ ...current, webhookSecret: event.target.value }))
            }
            placeholder={form.editMode ? "输入新 Webhook Secret 以轮换 (留空则不修改)" : "Webhook Secret (whsec_...)"}
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          {form.editMode ? (
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              启用该账号
            </label>
          ) : null}
          <div className="space-y-2 text-xs text-slate-400">
            <p>创建 Stripe 账号后，系统会自动生成 Webhook 路径供你在 Stripe 后台配置。</p>
            <p>Secret Key 和 Webhook Secret 会加密存储，请妥善保管原始密钥。</p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
            disabled={isPending || !form.accountLabel || (!form.editMode && (!form.secretKey || !form.webhookSecret))}
          >
            {form.editMode ? "保存修改" : "创建账号"}
          </button>
          {form.editMode ? (
            <button
              type="button"
              className="rounded-full border border-rose-500/30 px-5 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
              onClick={() => handleDelete(form.id!)}
              disabled={isPending}
            >
              删除账号
            </button>
          ) : null}
        </div>
      </form>

      {/* List Section */}
      <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-6">
        <div className="text-lg">Stripe 账号列表</div>
        <div className="mt-4 space-y-3">
          {accounts.length === 0 ? (
            <div className="text-slate-400">暂无 Stripe 账号。</div>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{account.accountLabel}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Webhook: {account.webhookPath}
                    </div>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-xs ${
                      account.isActive
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {account.isActive ? "启用中" : "已停用"}
                  </div>
                </div>
                {account.domainCount > 0 ? (
                  <div className="mt-3 text-xs text-slate-400">
                    已绑定 {account.domainCount} 个域名:{" "}
                    {account.domains.map((d) => d.hostname).join(", ")}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-500">未绑定域名</div>
                )}
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
