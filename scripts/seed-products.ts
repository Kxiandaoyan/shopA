import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { loadCatalogSource } from "@/lib/products/catalog";

async function main() {
  const products = await loadCatalogSource();

  for (const product of products) {
    await db.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        category: product.category,
        image: product.image,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        currency: product.currency,
        features: product.features,
      },
      create: {
        id: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
        description: product.description,
        price: new Prisma.Decimal(product.price),
        currency: product.currency,
        features: product.features,
      },
    });
  }
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
