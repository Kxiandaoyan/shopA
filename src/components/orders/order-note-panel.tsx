"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type InternalNote = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  note: string;
  createdAt: string;
};

type OrderNotePanelProps = {
  orderId: string;
  notes: InternalNote[];
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function OrderNotePanel({ orderId, notes }: OrderNotePanelProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
      <div className="text-lg">内部备注</div>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        用于记录人工处理说明、分销商沟通结果或后续跟进，不会展示给买家或分销商。
      </p>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ note }),
            });
            const result = (await response.json()) as { ok?: boolean; message?: string };

            if (result.ok) {
              setNote("");
              setMessage("备注已保存。");
              router.refresh();
              return;
            }

            setMessage(result.message ?? "备注保存失败。");
          });
        }}
      >
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="输入内部备注，例如：已联系分销商确认回调地址异常，待对方修复后重发。"
          className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="mt-4 rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm text-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isPending || note.trim().length < 2}
        >
          {isPending ? "保存中..." : "添加备注"}
        </button>
      </form>

      {message ? <div className="mt-4 text-sm text-amber-200">{message}</div> : null}

      <div className="mt-6 space-y-4">
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-500">
            暂无内部备注。
          </div>
        ) : (
          notes.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-white">{item.actorName}</div>
                <div className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
              </div>
              {item.actorEmail ? (
                <div className="mt-1 text-xs text-slate-500">{item.actorEmail}</div>
              ) : null}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {item.note}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
