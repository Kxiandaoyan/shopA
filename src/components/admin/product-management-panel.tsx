"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ProductSummary = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
};

type ProductFormState = {
  id: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  image: string;
  description: string;
  featuresText: string;
  editMode: boolean;
};

type ProductManagementPanelProps = {
  products: ProductSummary[];
};

function buildEmptyForm(): ProductFormState {
  return {
    id: "",
    name: "",
    category: "",
    price: "",
    currency: "USD",
    image: "",
    description: "",
    featuresText: "",
    editMode: false,
  };
}

function buildProductForm(product: ProductSummary): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price.toFixed(2),
    currency: product.currency,
    image: product.image,
    description: product.description,
    featuresText: product.features.join("\n"),
    editMode: true,
  };
}

function normalizeFeatures(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ProductManagementPanel({ products }: ProductManagementPanelProps) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ProductFormState>(buildEmptyForm);

  return (
    <section className="mt-10 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const response = await fetch("/api/admin/products", {
              method: form.editMode ? "PATCH" : "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                id: form.id,
                name: form.name,
                category: form.category,
                price: form.price,
                currency: form.currency,
                image: form.image,
                description: form.description,
                features: normalizeFeatures(form.featuresText),
              }),
            });

            const result = await response.json();

            if (result.ok) {
              setSelectedProductId("");
              setForm(buildEmptyForm());
              setMessage(form.editMode ? "商品已更新，列表已刷新。" : "商品已创建，列表已刷新。");
              router.refresh();
              return;
            }

            setMessage(result.message ?? "保存失败");
          });
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg">{form.editMode ? "编辑商品" : "新增商品"}</div>
          <select
            value={selectedProductId}
            onChange={(event) => {
              const nextId = event.target.value;
              setSelectedProductId(nextId);
              const selected = products.find((product) => product.id === nextId);
              setForm(selected ? buildProductForm(selected) : buildEmptyForm());
            }}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm outline-none"
          >
            <option value="">新建</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid gap-3">
          <input
            value={form.id}
            onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))}
            placeholder="商品 ID"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="商品名称"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <input
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="分类"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <div className="grid gap-3 md:grid-cols-[1fr_0.7fr]">
            <input
              value={form.price}
              onChange={(event) =>
                setForm((current) => ({ ...current, price: event.target.value }))
              }
              placeholder="价格"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
            <input
              value={form.currency}
              onChange={(event) =>
                setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
              }
              placeholder="币种"
              className="rounded-xl bg-white/10 px-4 py-3 outline-none"
            />
          </div>
          <input
            value={form.image}
            onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))}
            placeholder="图片 URL"
            className="rounded-xl bg-white/10 px-4 py-3 outline-none"
          />
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="商品描述"
            rows={5}
            className="rounded-2xl bg-white/10 px-4 py-3 outline-none"
          />
          <textarea
            value={form.featuresText}
            onChange={(event) =>
              setForm((current) => ({ ...current, featuresText: event.target.value }))
            }
            placeholder={"卖点，每行一个\n例如：\nLightweight body\nFast shipping"}
            rows={6}
            className="rounded-2xl bg-white/10 px-4 py-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="mt-4 rounded-full bg-white px-5 py-2 text-sm text-slate-950 disabled:opacity-50"
          disabled={isPending}
        >
          {form.editMode ? "保存修改" : "创建商品"}
        </button>

        <div className="mt-4 text-sm text-emerald-300">{message}</div>
      </form>

      <div className="rounded-[1.8rem] border border-white/10 bg-white/5 p-6">
        <div className="text-lg">现有商品</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {products.length === 0 ? (
            <div className="text-slate-400">暂无商品数据。</div>
          ) : (
            products.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5"
              >
                <div
                  className="aspect-[4/3] bg-cover bg-center"
                  style={{ backgroundImage: `url(${product.image})` }}
                />
                <div className="space-y-2 p-4">
                  <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
                    {product.category}
                  </div>
                  <div className="text-lg">{product.name}</div>
                  <div className="text-sm text-slate-300">
                    {product.currency} {product.price.toFixed(2)}
                  </div>
                  <p className="text-sm leading-6 text-slate-400">{product.description}</p>
                  <div className="text-xs text-slate-500">更新时间：{product.updatedAt}</div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
