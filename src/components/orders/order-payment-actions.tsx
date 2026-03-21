"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type OrderPaymentActionsProps = {
  orderId: string;
  orderStatus: string;
  paymentSessionCount: number;
};

export function OrderPaymentActions({
  orderId,
  orderStatus,
  paymentSessionCount,
}: OrderPaymentActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSync = paymentSessionCount > 0;

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
      <div className="text-lg">Stripe 状态同步</div>
      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <div>当前订单状态：{orderStatus}</div>
        <div>已记录支付会话：{paymentSessionCount}</div>
        {!canSync ? <div className="text-slate-500">当前订单还没有可同步的 Stripe 会话。</div> : null}
      </div>

      <button
        type="button"
        className="mt-4 rounded-full border border-sky-400/30 bg-sky-400/10 px-5 py-2 text-sm text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canSync || isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/resync`, {
              method: "POST",
            });
            const result = (await response.json()) as { message?: string };
            setMessage(result.message ?? "同步失败。");
            router.refresh();
          });
        }}
      >
        {isPending ? "同步中..." : "同步 Stripe 状态"}
      </button>

      {message ? <div className="mt-4 text-sm text-sky-200">{message}</div> : null}
    </div>
  );
}
