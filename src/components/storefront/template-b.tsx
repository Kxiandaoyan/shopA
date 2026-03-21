/* eslint-disable @next/next/no-img-element */
import type { CatalogProduct } from "@/lib/products/catalog";

type TemplateProps = {
  products: CatalogProduct[];
};

export function TemplateB({ products }: TemplateProps) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <section className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <div className="text-xs uppercase tracking-[0.24em] text-[#9ab3a2]">Field-tested detail</div>
          <h1 className="mt-4 text-5xl leading-tight">
            Cleaning tools with more proof, more materials, and more visual context.
          </h1>
          <p className="mt-4 text-base leading-8 text-[#c7d2ca]">
            An editorial layout with larger media frames, clearer spacing, and calmer product reading before the buyer enters payment.
          </p>
          <div className="mt-8 grid gap-4">
            {products.slice(0, 3).map((product) => (
              <div key={product.id} className="rounded-[1.5rem] border border-white/8 bg-[#17352c] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#24473c] p-3">
                    <img src={product.image} alt={product.name} className="max-h-full w-full object-contain" loading="lazy" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#9ab3a2]">{product.name}</div>
                    <div className="mt-2 text-sm text-[#dbe6de]">{product.features[0]}</div>
                  </div>
                </div>
                <a
                  href={`/?product=${product.id}#buy-now`}
                  className="mt-4 inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white"
                >
                  Buy now
                </a>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/5 p-6 md:grid-cols-[0.95fr_1.05fr]"
            >
              <div className="rounded-[1.55rem] border border-white/8 bg-[linear-gradient(180deg,#17352c_0%,#214338_100%)] p-5">
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.2rem] bg-[#24473c]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#9ab3a2]">{product.category}</div>
                  <h2 className="mt-2 text-2xl leading-snug">{product.name}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#cfdbd3]">{product.description}</p>
                  <ul className="mt-5 grid gap-3 text-sm text-[#d5e2db]">
                    {product.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="rounded-2xl bg-[#17352c] px-4 py-3">
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-full bg-[#17352c] px-4 py-2 text-sm text-white">
                    {product.currency} {product.price.toFixed(2)}
                  </div>
                  <a
                    href={`/?product=${product.id}#buy-now`}
                    className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm text-white"
                  >
                    Buy now
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
