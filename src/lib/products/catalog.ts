import { promises as fs } from "node:fs";
import path from "node:path";

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  description: string;
  features: string[];
};

type ProductSourceFile = {
  products: CatalogProduct[];
};

async function resolveCatalogSourcePath() {
  const cwd = process.cwd();
  const entries = await fs.readdir(cwd, { withFileTypes: true });
  const txtFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
    .map((entry) => entry.name);
  const preferred = txtFiles
    .filter((entry) => /^b.*\.txt$/i.test(entry))
    .sort((left, right) => right.localeCompare(left, "en"));

  if (preferred.length > 0) {
    return path.join(cwd, preferred[0]);
  }

  if (txtFiles.length > 0) {
    return path.join(cwd, txtFiles[0]);
  }

  throw new Error("Catalog source TXT file was not found.");
}

export async function loadCatalogSource(): Promise<CatalogProduct[]> {
  const sourcePath = await resolveCatalogSourcePath();
  const raw = await fs.readFile(sourcePath, "utf8");
  const parsed = JSON.parse(raw) as ProductSourceFile;
  return parsed.products;
}

export async function getStorefrontProducts(limit = 4): Promise<CatalogProduct[]> {
  try {
    const { db } = await import("@/lib/db");
    const products = await db.product.findMany({
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    if (products.length > 0) {
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: Number(product.price),
        currency: product.currency,
        image: product.image,
        description: product.description,
        features: Array.isArray(product.features) ? (product.features as string[]) : [],
      }));
    }
  } catch {
    // Fall back to the source file before database setup is complete.
  }

  const sourceProducts = await loadCatalogSource();
  return sourceProducts.slice(0, limit);
}
