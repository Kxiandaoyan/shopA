/* eslint-disable @next/next/no-img-element */
import type { CatalogProduct } from "@/lib/products/catalog";

type TemplateProps = {
  products: CatalogProduct[];
};

export function TemplateC({ products }: TemplateProps) {
  const leadProducts = products.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
        <div className="rounded-[2.2rem] border border-[#efceb0] bg-white p-8 shadow-[0_24px_60px_rgba(121,63,20,0.12)]">
          <div className="text-xs uppercase tracking-[0.24em] text-[#b46d38]">Fast checkout campaign</div>
          <h1 className="mt-4 max-w-xl text-5xl leading-tight">
            High-utility cleaning tools, framed like a fast campaign and finished with compliant checkout.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-[#6e4d34]">
            Stronger hierarchy, brighter surfaces, and roomier product media so each item reads quickly without losing the full image.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.4rem] bg-[#fff1e3] p-4">
              <div className="text-sm text-[#b46d38]">1</div>
              <div className="mt-2 text-lg">Choose</div>
            </div>
            <div className="rounded-[1.4rem] bg-[#fff1e3] p-4">
              <div className="text-sm text-[#b46d38]">2</div>
              <div className="mt-2 text-lg">Address</div>
            </div>
            <div className="rounded-[1.4rem] bg-[#fff1e3] p-4">
              <div className="text-sm text-[#b46d38]">3</div>
              <div className="mt-2 text-lg">Pay</div>
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          {leadProducts.map((product) => (
            <article key={product.id} className="rounded-[1.8rem] border border-[#f0d2b8] bg-[#fff9f2] p-5">
              <div className="rounded-[1.4rem] border border-[#f1d7c1] bg-[linear-gradient(180deg,#fff8f0_0%,#fdeedc_100%)] p-4">
                <div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-[1.15rem] bg-[#fff4e9]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.2em] text-[#b46d38]">{product.category}</div>
                  <h2 className="mt-2 text-2xl leading-snug">{product.name}</h2>
                </div>
                <div className="rounded-full bg-[#2c4b3c] px-4 py-2 text-sm text-white">
                  {product.currency} {product.price.toFixed(2)}
                </div>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#6e4d34]">{product.description}</p>
              <div className="mt-4 rounded-2xl bg-[#fff1e3] px-4 py-3 text-sm text-[#8e633f]">{product.features[0]}</div>
              <a
                href={`/?product=${product.id}#buy-now`}
                className="mt-4 inline-flex rounded-full bg-[#2c4b3c] px-4 py-2 text-sm text-white transition hover:opacity-90"
              >
                Buy now
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
