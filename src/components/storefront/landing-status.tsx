import type { LandingOrderContext } from "@/lib/orders/order-context";

type LandingStatusProps = {
  order: LandingOrderContext | null;
  hasStripeAccount: boolean;
};

export function LandingStatus({ order, hasStripeAccount }: LandingStatusProps) {
  if (!order) {
    return (
      <section className="mx-auto max-w-6xl px-6 pb-12 lg:px-10">
        <div className="rounded-[2rem] border border-red-200 bg-white/90 p-6 text-[#6d2b22] shadow-[var(--shadow)]">
          <div className="text-xs uppercase tracking-[0.22em] opacity-60">Context unavailable</div>
          <h2 className="mt-3 text-2xl">This payment link is invalid for the current domain.</h2>
          <p className="mt-3 text-sm leading-7 opacity-80">
            The homepage loaded, but the order token does not match this domain or no matching order exists.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 pb-12 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-white/90 p-6 shadow-[var(--shadow)]">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Buyer context locked</div>
          <h2 className="mt-3 text-3xl">Preparing secure checkout for {order.buyerName}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
            Shipping details are already attached to this order. The storefront only validates the landing step and then continues to payment.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] bg-[var(--accent-soft)]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Order</div>
              <div className="mt-2 text-sm">{order.orderId}</div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--accent-soft)]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Amount</div>
              <div className="mt-2 text-xl">
                {order.currency} {order.totalAmount.toFixed(2)}
              </div>
            </div>
            <div className="rounded-[1.4rem] bg-[var(--accent-soft)]/60 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Stripe</div>
              <div className="mt-2 text-sm">{hasStripeAccount ? "Configured" : "Pending setup"}</div>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Order items</div>
          <div className="mt-4 space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-[1.3rem] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm">{item.productName}</div>
                  <div className="text-sm">
                    x{item.quantity} / {order.currency} {item.unitPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
            Redirecting to payment now. If checkout cannot be opened, the next step will show a clear domain or payment configuration message.
          </p>
        </div>
      </div>
    </section>
  );
}
