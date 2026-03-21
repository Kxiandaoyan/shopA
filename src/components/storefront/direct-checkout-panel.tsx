/* eslint-disable @next/next/no-img-element */
"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { CatalogProduct } from "@/lib/products/catalog";

type DirectCheckoutPanelProps = {
  products: CatalogProduct[];
  enabled: boolean;
  reason?: string;
};

type BuyerFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  address1: string;
  address2: string;
  postalCode: string;
};

const emptyBuyerState: BuyerFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  state: "",
  city: "",
  address1: "",
  address2: "",
  postalCode: "",
};

export function DirectCheckoutPanel({
  products,
  enabled,
  reason = "Checkout is unavailable on this domain right now.",
}: DirectCheckoutPanelProps) {
  const searchParams = useSearchParams();
  const requestedProductId = searchParams.get("product");
  const defaultProductId =
    requestedProductId && products.some((product) => product.id === requestedProductId)
      ? requestedProductId
      : products[0]?.id ?? "";
  const [manualProductId, setManualProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [buyer, setBuyer] = useState<BuyerFormState>(emptyBuyerState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeProductId =
    manualProductId && products.some((product) => product.id === manualProductId)
      ? manualProductId
      : defaultProductId;
  const selectedProduct = products.find((product) => product.id === activeProductId) ?? products[0];
  const quantityValue = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const estimatedTotal = selectedProduct ? selectedProduct.price * quantityValue : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct || !enabled) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/storefront/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: quantityValue,
          buyer,
        }),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        message?: string;
        landingPath?: string;
      };

      if (!response.ok || !payload.ok || !payload.landingPath) {
        setError(payload.message ?? "The order could not be created. Please review the form and try again.");
        setSubmitting(false);
        return;
      }

      window.location.assign(payload.landingPath);
    } catch {
      setError("The order could not be submitted. Please try again in a moment.");
      setSubmitting(false);
    }
  }

  function updateBuyerField<K extends keyof BuyerFormState>(key: K, value: BuyerFormState[K]) {
    setBuyer((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <section id="buy-now" className="mx-auto max-w-6xl px-6 pb-16 lg:px-10">
      <div className="mb-6 max-w-2xl">
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Direct checkout</div>
        <h2 className="mt-3 text-4xl leading-tight">Complete the shipping details with room to breathe.</h2>
        <p className="mt-3 text-base leading-8 text-[var(--muted)]">
          The storefront creates the order first, returns through the homepage, and only then continues toward payment. If Stripe is not configured yet, payment stops at the checkout bridge.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Order summary</div>
            <div className="mt-5 rounded-[1.6rem] border border-[var(--border)] bg-[var(--accent-soft)]/35 p-4">
              <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.25rem] bg-white/75 p-4">
                {selectedProduct ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="max-h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : null}
              </div>
            </div>
            <div className="mt-5 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {selectedProduct?.category ?? "Selected product"}
            </div>
            <div className="mt-2 text-2xl leading-snug">{selectedProduct?.name ?? "No product available"}</div>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{selectedProduct?.description}</p>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)]/35 px-4 py-3">
                <span className="text-[var(--muted)]">Quantity</span>
                <span>{quantityValue}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)]/35 px-4 py-3">
                <span className="text-[var(--muted)]">Estimated total</span>
                <span className="text-lg text-[var(--accent-strong)]">
                  {selectedProduct?.currency ?? "USD"} {estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm leading-7 text-[var(--muted)]">
              {enabled ? "Orders can be created on this storefront now." : reason}
            </div>
          </div>
        </aside>
        <form
          className="grid gap-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]/95 p-6 shadow-[var(--shadow)]"
          onSubmit={handleSubmit}
        >
          <section className="grid gap-4 rounded-[1.7rem] border border-[var(--border)] bg-white/35 p-5">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Product setup</div>
              <h3 className="mt-2 text-2xl">Choose what the buyer will pay for.</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
              <label className="grid gap-2 text-sm">
                <span>Product</span>
                <select
                  value={activeProductId}
                  onChange={(event) => setManualProductId(event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
            </div>
          </section>
          <section className="grid gap-4 rounded-[1.7rem] border border-[var(--border)] bg-white/35 p-5">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Contact details</div>
              <h3 className="mt-2 text-2xl">Who is placing the order?</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm">
                <span>First name</span>
                <input
                  required
                  value={buyer.firstName}
                  onChange={(event) => updateBuyerField("firstName", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Last name</span>
                <input
                  required
                  value={buyer.lastName}
                  onChange={(event) => updateBuyerField("lastName", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={buyer.email}
                  onChange={(event) => updateBuyerField("email", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Phone</span>
                <input
                  required
                  value={buyer.phone}
                  onChange={(event) => updateBuyerField("phone", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
            </div>
          </section>
          <section className="grid gap-4 rounded-[1.7rem] border border-[var(--border)] bg-white/35 p-5">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Shipping address</div>
              <h3 className="mt-2 text-2xl">Where should the order be delivered?</h3>
            </div>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm">
                <span>Street address</span>
                <input
                  required
                  value={buyer.address1}
                  onChange={(event) => updateBuyerField("address1", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Apartment, suite, unit (optional)</span>
                <input
                  value={buyer.address2}
                  onChange={(event) => updateBuyerField("address2", event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                  disabled={!enabled || submitting}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span>City</span>
                  <input
                    required
                    value={buyer.city}
                    onChange={(event) => updateBuyerField("city", event.target.value)}
                    className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                    disabled={!enabled || submitting}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>State / Region</span>
                  <input
                    required
                    value={buyer.state}
                    onChange={(event) => updateBuyerField("state", event.target.value)}
                    className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                    disabled={!enabled || submitting}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span>Postal code</span>
                  <input
                    required
                    value={buyer.postalCode}
                    onChange={(event) => updateBuyerField("postalCode", event.target.value)}
                    className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                    disabled={!enabled || submitting}
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span>Country</span>
                  <input
                    required
                    value={buyer.country}
                    onChange={(event) => updateBuyerField("country", event.target.value)}
                    className="rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-3.5 text-base text-[#17281f] outline-none"
                    disabled={!enabled || submitting}
                  />
                </label>
              </div>
            </div>
          </section>
          {error ? (
            <div className="rounded-2xl border border-[#d17d67] bg-[#fff2ef] px-4 py-3 text-sm text-[#9c3f27]">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className="inline-flex min-h-14 items-center justify-center rounded-full bg-[var(--accent-strong)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!enabled || submitting || products.length === 0}
          >
            {submitting ? "Creating order..." : "Continue to secure payment"}
          </button>
        </form>
      </div>
    </section>
  );
}
