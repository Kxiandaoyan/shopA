"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type OrderCallbackActionsProps = {
  orderId: string;
  orderStatus: string;
  returnUrl: string | null;
};

const terminalStatuses = new Set(["PAID", "FAILED", "EXPIRED", "CANCELED"]);

export function OrderCallbackActions({
  orderId,
  orderStatus,
  returnUrl,
}: OrderCallbackActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canResend = Boolean(returnUrl) && terminalStatuses.has(orderStatus);

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
      <div className="text-lg">分销商回跳通知</div>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div>当前订单状态：{orderStatus}</div>
        <div className="break-all">回跳地址：{returnUrl ?? "未配置"}</div>
        {!returnUrl ? <div className="text-slate-500">当前订单没有可重发的回跳地址。</div> : null}
        {returnUrl && !terminalStatuses.has(orderStatus) ? (
          <div className="text-slate-500">只有终态订单才允许手动重发回跳通知。</div>
        ) : null}
      </div>

      <button
        type="button"
        className="mt-4 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canResend || isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/callback`, {
              method: "POST",
            });
            const result = (await response.json()) as { message?: string };
            setMessage(result.message ?? "回跳重发失败。");
            router.refresh();
          });
        }}
      >
        {isPending ? "重发中..." : "重发回跳通知"}
      </button>

      {message ? <div className="mt-4 text-sm text-emerald-300">{message}</div> : null}
    </div>
  );
}
