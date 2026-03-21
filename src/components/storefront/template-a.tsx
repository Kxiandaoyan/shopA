/* eslint-disable @next/next/no-img-element */
import type { CatalogProduct } from "@/lib/products/catalog";

type TemplateProps = {
  products: CatalogProduct[];
};

export function TemplateA({ products }: TemplateProps) {
  const heroProduct = products[0];
  const supportingProducts = products.slice(1, 4);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
      <section className="space-y-8">
        <div className="inline-flex rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
          Everyday cleaning, better designed
        </div>
        <div className="space-y-4">
          <h1 className="max-w-2xl text-5xl leading-tight md:text-6xl">
            Clean lines for the tools that keep the whole home moving.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
            A warmer storefront treatment for practical home-care tools, with calmer product framing and a more spacious buying surface.
          </p>
        </div>
        {heroProduct ? (
          <article className="grid gap-6 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] md:grid-cols-[1.06fr_0.94fr]">
            <div className="rounded-[1.7rem] border border-[var(--border)] bg-[linear-gradient(180deg,#fbfcf9_0%,#edf3ec_100%)] p-5">
              <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.35rem] bg-white/70">
                <img
                  src={heroProduct.image}
                  alt={heroProduct.name}
                  className="max-h-full w-full object-contain"
                  loading="eager"
                />
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Featured product
                </div>
                <h2 className="mt-3 text-3xl">{heroProduct.name}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {heroProduct.description}
                </p>
                <ul className="mt-6 grid gap-3 text-sm text-[var(--muted)]">
                  {heroProduct.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="rounded-2xl bg-[var(--accent-soft)]/50 px-4 py-3">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Price</div>
                  <div className="mt-1 text-2xl text-[var(--accent-strong)]">
                    {heroProduct.currency} {heroProduct.price.toFixed(2)}
                  </div>
                </div>
                <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm">
                  Floor-to-finish utility
                </div>
              </div>
              <a
                href={`/?product=${heroProduct.id}#buy-now`}
                className="inline-flex w-fit rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm text-white transition hover:opacity-90"
              >
                Buy now
              </a>
            </div>
          </article>
        ) : null}
        <div className="grid gap-5 md:grid-cols-3">
          {supportingProducts.map((product) => (
            <article
              key={product.id}
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur"
            >
              <div className="rounded-[1.5rem] border border-[var(--border)] bg-[linear-gradient(180deg,#f7faf4_0%,#edf3ec_100%)] p-4">
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[1.2rem] bg-white/70">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {product.category}
              </div>
              <h2 className="mt-2 text-xl leading-snug">{product.name}</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{product.description}</p>
              <div className="mt-4 text-lg text-[var(--accent-strong)]">
                {product.currency} {product.price.toFixed(2)}
              </div>
              <a
                href={`/?product=${product.id}#buy-now`}
                className="mt-4 inline-flex rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm text-white transition hover:opacity-90"
              >
                Buy now
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-[var(--shadow)]">
        <div className="space-y-5">
          <div className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Secure checkout bridge</div>
          <h2 className="text-3xl">See the product clearly, then move into payment with context already locked.</h2>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Direct buyers can create an order here. Affiliate traffic still uses the same landing-first sequence before checkout.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          {products.slice(0, 3).map((product) => (
            <div key={product.id} className="rounded-[1.5rem] bg-[var(--accent-soft)]/50 p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.1rem] bg-white/75 p-3">
                  <img src={product.image} alt={product.name} className="max-h-full w-full object-contain" loading="lazy" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{product.category}</div>
                  <div className="mt-1 text-lg leading-snug">{product.name}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">{product.features[0]}</div>
                </div>
              </div>
              <a
                href={`/?product=${product.id}#buy-now`}
                className="mt-4 inline-flex rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                Buy now
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
