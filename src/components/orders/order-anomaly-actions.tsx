"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type AnomalyItem = {
  orderId: string;
  severity: "medium" | "high";
  kind: string;
  summary: string;
};

type OrderAnomalyActionsProps = {
  items: AnomalyItem[];
};

export function OrderAnomalyActions({ items }: OrderAnomalyActionsProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const allIds = useMemo(() => [...new Set(items.map((item) => item.orderId))], [items]);
  const selectedCount = selectedIds.length;

  const toggleOrder = (orderId: string) => {
    setSelectedIds((current) =>
      current.includes(orderId)
        ? current.filter((item) => item !== orderId)
        : [...current, orderId],
    );
  };

  const toggleAll = () => {
    setSelectedIds((current) => (current.length === allIds.length ? [] : allIds));
  };

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-lg">批量处理</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            可勾选多条异常订单后，批量同步 Stripe 最新状态。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white"
            onClick={toggleAll}
          >
            {selectedCount === allIds.length && allIds.length > 0 ? "取消全选" : "全选当前页"}
          </button>
          <button
            type="button"
            className="rounded-full border border-sky-400/30 bg-sky-400/10 px-5 py-2 text-sm text-sky-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedCount === 0 || isPending}
            onClick={() => {
              startTransition(async () => {
                const response = await fetch("/api/admin/orders/batch/resync", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    orderIds: selectedIds,
                  }),
                });
                const result = (await response.json()) as {
                  total?: number;
                  successCount?: number;
                  failureCount?: number;
                  message?: string;
                };

                if (response.ok) {
                  setMessage(
                    `批量同步完成：共 ${result.total ?? selectedCount} 笔，成功 ${result.successCount ?? 0}，失败 ${result.failureCount ?? 0}。`,
                  );
                  setSelectedIds([]);
                  router.refresh();
                  return;
                }

                setMessage(result.message ?? "批量同步失败。");
              });
            }}
          >
            {isPending ? "处理中..." : `批量同步 Stripe 状态 (${selectedCount})`}
          </button>
        </div>
      </div>

      {message ? <div className="mt-4 text-sm text-sky-200">{message}</div> : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <label
            key={`${item.orderId}-${item.kind}`}
            className="flex gap-3 rounded-2xl border border-white/10 bg-black/10 p-4"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(item.orderId)}
              onChange={() => toggleOrder(item.orderId)}
              className="mt-1"
            />
            <div className="min-w-0">
              <div className="text-sm text-white">{item.orderId}</div>
              <div className="mt-1 text-xs text-slate-500">
                {item.severity === "high" ? "高优先级" : "中优先级"} / {item.kind}
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</div>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
}
