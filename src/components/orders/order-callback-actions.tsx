"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type OrderCallbackActionsProps = {
  orderId: string;
  orderStatus: string;
  returnUrl: string | null;
  asyncWebhookEndpointCount: number;
};

const terminalStatuses = new Set(["PAID", "FAILED", "EXPIRED", "CANCELED"]);

export function OrderCallbackActions({
  orderId,
  orderStatus,
  returnUrl,
  asyncWebhookEndpointCount,
}: OrderCallbackActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [webhookMessage, setWebhookMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canResendReturn = Boolean(returnUrl) && terminalStatuses.has(orderStatus);
  const canResendWebhooks =
    asyncWebhookEndpointCount > 0 && terminalStatuses.has(orderStatus);

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
      <div className="text-lg">分销商回调与通知</div>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div>当前订单状态：{orderStatus}</div>
        <div className="break-all">浏览器回跳地址：{returnUrl ?? "未配置"}</div>
        <div>异步通知地址数量：{asyncWebhookEndpointCount}</div>
        {!returnUrl ? (
          <div className="text-slate-500">当前订单没有可重发的浏览器回跳地址。</div>
        ) : null}
        {asyncWebhookEndpointCount === 0 ? (
          <div className="text-slate-500">当前分销商没有启用的异步通知地址。</div>
        ) : null}
        {!terminalStatuses.has(orderStatus) ? (
          <div className="text-slate-500">只有终态订单才允许手动重发回调通知。</div>
        ) : null}
      </div>

      <button
        type="button"
        className="mt-4 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canResendReturn || isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/callback`, {
              method: "POST",
            });
            const result = (await response.json()) as { message?: string };
            setMessage(result.message ?? "浏览器回跳重发失败。");
            router.refresh();
          });
        }}
      >
        {isPending ? "处理中..." : "重发浏览器回跳"}
      </button>

      <button
        type="button"
        className="mt-3 rounded-full border border-sky-400/30 bg-sky-400/10 px-5 py-2 text-sm text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canResendWebhooks || isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/webhooks`, {
              method: "POST",
            });
            const result = (await response.json()) as {
              message?: string;
              successCount?: number;
              deliveredCount?: number;
            };

            setWebhookMessage(
              result.message ??
                `异步通知已处理，成功 ${result.successCount ?? 0} / 尝试 ${result.deliveredCount ?? 0}。`,
            );
            router.refresh();
          });
        }}
      >
        {isPending ? "处理中..." : "重发异步通知"}
      </button>

      {message ? <div className="mt-4 text-sm text-emerald-300">{message}</div> : null}
      {webhookMessage ? <div className="mt-2 text-sm text-sky-300">{webhookMessage}</div> : null}
    </div>
  );
}
