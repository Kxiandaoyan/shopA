"use client";

import { useState, useTransition } from "react";

type AffiliateDetails = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  domains: Array<{ id: string; hostname: string; label: string; isActive: boolean }>;
  returnUrls: Array<{ id: string; url: string; isActive: boolean }>;
  webhookEndpoints: Array<{ id: string; url: string; isActive: boolean }>;
};

type StripeAccountSummary = {
  id: string;
  accountLabel: string;
  isActive: boolean;
  webhookPath: string;
  domains: Array<{ id: string; hostname: string }>;
};

type AffiliateIntegrationPanelProps = {
  affiliate: AffiliateDetails;
  stripeAccounts: StripeAccountSummary[];
};

async function requestJson(url: string, method: "POST" | "PATCH" | "DELETE", payload?: Record<string, unknown>) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return response.json();
}

export function AffiliateIntegrationPanel({
  affiliate,
  stripeAccounts,
}: AffiliateIntegrationPanelProps) {
  const [message, setMessage] = useState("");
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [returnUrlForm, setReturnUrlForm] = useState({ url: "", isActive: true });
  const [webhookForm, setWebhookForm] = useState({ url: "", isActive: true });

  const activeReturnUrls = affiliate.returnUrls.filter((u) => u.isActive);
  const activeWebhooks = affiliate.webhookEndpoints.filter((w) => w.isActive);

  const handleAddReturnUrl = () => {
    if (!returnUrlForm.url) return;
    startTransition(async () => {
      const result = await requestJson("/api/affiliate/return-urls", "POST", {
        url: returnUrlForm.url,
        isActive: returnUrlForm.isActive,
      });
      if (result.ok) {
        setMessage("回跳地址已添加");
        setReturnUrlForm({ url: "", isActive: true });
        window.location.reload();
      } else {
        setMessage(result.message ?? "添加失败");
      }
    });
  };

  const handleAddWebhook = () => {
    if (!webhookForm.url) return;
    startTransition(async () => {
      const result = await requestJson("/api/affiliate/webhook-endpoints", "POST", {
        url: webhookForm.url,
        isActive: webhookForm.isActive,
      });
      if (result.ok) {
        setMessage("Webhook 地址已添加");
        setWebhookForm({ url: "", isActive: true });
        window.location.reload();
      } else {
        setMessage(result.message ?? "添加失败");
      }
    });
  };

  // 测试回跳
  const handleTestCallback = (url: string) => {
    startTransition(async () => {
      const result = await requestJson("/api/affiliate/test/callback", "POST", {
        url,
      });

      if (result.ok) {
        setTestResult({
          type: "success",
          message: `回跳测试成功！已在新窗口打开测试页面。状态码: ${result.status || "N/A"}`,
        });
      } else {
        setTestResult({
          type: "error",
          message: result.message || "回跳测试失败",
        });
      }
    });
  };

  // 测试 Webhook
  const handleTestWebhook = (url: string) => {
    startTransition(async () => {
      const result = await requestJson("/api/affiliate/test/webhook", "POST", {
        url,
      });

      if (result.ok) {
        setTestResult({
          type: "success",
          message: `Webhook 测试已发送！响应状态: ${result.responseStatus || "N/A"}，响应时间: ${result.responseTime || "N/A"}ms`,
        });
      } else {
        setTestResult({
          type: "error",
          message: result.message || "Webhook 测试失败",
        });
      }
    });
  };

  // 找到分配给该分销商的域名对应的 Stripe 账号
  const domainIds = new Set(affiliate.domains.map((d) => d.id));
  const relatedStripeAccounts = stripeAccounts.filter((account) =>
    account.domains.some((d) => domainIds.has(d.id))
  );

  return (
    <div className="mt-8 space-y-6">
      {/* 对接文档 */}
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">API 对接文档</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700">
          <div>
            <strong>1. 接口地址</strong>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-4 text-xs">
              POST https://your-domain.com/api/intake/orders
            </pre>
          </div>
          <div>
            <strong>2. 分销商编码</strong>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-100 p-4 text-xs">
              {affiliate.code}
            </pre>
          </div>
          <div>
            <strong>3. 接单签名密钥 (Intake Secret)</strong>
            <p className="mt-2 text-slate-500">
              用于签名 intake API 请求，请联系管理员获取或轮换密钥。
            </p>
          </div>
          <div>
            <strong>4. 回跳签名密钥 (Callback Secret)</strong>
            <p className="mt-2 text-slate-500">
              用于验证支付完成后的回跳参数，请联系管理员获取或轮换密钥。
            </p>
          </div>
          <div>
            <strong>5. Webhook 通知</strong>
            <p className="mt-2 text-slate-500">
              系统会在订单进入终态后主动向配置的 Webhook 地址发送 POST JSON 通知。
            </p>
          </div>
        </div>
      </div>

      {/* 已分配域名 */}
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">已分配域名</h2>
        {affiliate.domains.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">暂无分配域名。</p>
        ) : (
          <div className="mt-4 space-y-2">
            {affiliate.domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="font-medium">{domain.hostname}</div>
                  <div className="text-xs text-slate-500">{domain.label}</div>
                </div>
                <div className={`text-xs ${domain.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                  {domain.isActive ? "启用中" : "已停用"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stripe Webhook 路径 */}
      {relatedStripeAccounts.length > 0 && (
        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Stripe Webhook 配置</h2>
          <p className="mt-2 text-sm text-slate-500">
            请在 Stripe 后台配置以下 Webhook 地址：
          </p>
          <div className="mt-4 space-y-2">
            {relatedStripeAccounts.map((account) => (
              <div key={account.id} className="rounded-xl border border-slate-200 p-3">
                <div className="font-medium">{account.accountLabel}</div>
                <pre className="mt-2 overflow-x-auto text-xs text-slate-600">
                  https://your-domain.com{account.webhookPath}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 配置回跳地址 */}
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">回跳地址白名单</h2>
          {activeReturnUrls.length > 0 && (
            <span className="text-xs text-emerald-600">{activeReturnUrls.length} 个已启用</span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          支付完成后会跳转到这些地址之一，携带订单状态参数。
        </p>

        {affiliate.returnUrls.length > 0 && (
          <div className="mt-4 space-y-2">
            {affiliate.returnUrls.map((url) => (
              <div key={url.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <code className="text-xs">{url.url}</code>
                <div className="flex items-center gap-2">
                  {url.isActive && (
                    <button
                      onClick={() => handleTestCallback(url.url)}
                      disabled={isPending}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                    >
                      测试
                    </button>
                  )}
                  <div className={`text-xs ${url.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {url.isActive ? "启用中" : "已停用"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <input
            value={returnUrlForm.url}
            onChange={(e) => setReturnUrlForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://example.com/payment/complete"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={returnUrlForm.isActive}
                onChange={(e) => setReturnUrlForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              启用
            </label>
            <button
              onClick={handleAddReturnUrl}
              disabled={isPending || !returnUrlForm.url}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white disabled:opacity-50"
            >
              添加回跳地址
            </button>
          </div>
        </div>
      </div>

      {/* 配置 Webhook */}
      <div className="rounded-[1.6rem] border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Webhook 通知地址</h2>
          {activeWebhooks.length > 0 && (
            <span className="text-xs text-emerald-600">{activeWebhooks.length} 个已启用</span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          订单进入终态后会向这些地址发送 POST JSON 通知。
        </p>

        {affiliate.webhookEndpoints.length > 0 && (
          <div className="mt-4 space-y-2">
            {affiliate.webhookEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <code className="text-xs">{endpoint.url}</code>
                <div className="flex items-center gap-2">
                  {endpoint.isActive && (
                    <button
                      onClick={() => handleTestWebhook(endpoint.url)}
                      disabled={isPending}
                      className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                    >
                      测试
                    </button>
                  )}
                  <div className={`text-xs ${endpoint.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                    {endpoint.isActive ? "启用中" : "已停用"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          <input
            value={webhookForm.url}
            onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://example.com/api/payment-webhook"
            className="rounded-xl border border-slate-200 px-4 py-3 outline-none"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={webhookForm.isActive}
                onChange={(e) => setWebhookForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              启用
            </label>
            <button
              onClick={handleAddWebhook}
              disabled={isPending || !webhookForm.url}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white disabled:opacity-50"
            >
              添加 Webhook
            </button>
          </div>
        </div>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            testResult.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {testResult.message}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
}
