"use client";

import { AutoForward } from "@/components/storefront/auto-forward";

type ResultBridgeProps = {
  title: string;
  message: string;
  returnUrl?: string | null;
};

export function ResultBridge({ title, message, returnUrl }: ResultBridgeProps) {
  return (
    <main className="min-h-screen bg-[#111827] px-6 py-12 text-white lg:px-10">
      {returnUrl ? <AutoForward href={returnUrl} delayMs={500} /> : null}
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Payment bridge</div>
        <h1 className="mt-4 text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{message}</p>
        <div className="mt-8 text-sm text-slate-400">
          {returnUrl
            ? "Returning to the originating site now."
            : "This order stays on the storefront because no external return URL is attached."}
        </div>
      </div>
    </main>
  );
}
