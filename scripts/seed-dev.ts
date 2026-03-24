import { Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { encryptValue } from "@/lib/security/encryption";
import { loadCatalogSource } from "@/lib/products/catalog";

async function seedProducts() {
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

async function main() {
  await seedProducts();

  const affiliate = await db.affiliate.upsert({
    where: { code: "AFF_DEMO" },
    update: {
      name: "Demo Affiliate",
      intakeSecretEncrypted: encryptValue("demo-intake-secret"),
      callbackSecretEncrypted: encryptValue("demo-callback-secret"),
      isActive: true,
    },
    create: {
      code: "AFF_DEMO",
      name: "Demo Affiliate",
      intakeSecretEncrypted: encryptValue("demo-intake-secret"),
      callbackSecretEncrypted: encryptValue("demo-callback-secret"),
    },
  });

  const domain = await db.landingDomain.upsert({
    where: { hostname: "demo.localhost" },
    update: {
      label: "Demo Domain",
      isActive: true,
    },
    create: {
      hostname: "demo.localhost",
      label: "Demo Domain",
      isActive: true,
    },
  });

  // 创建域名与分销商的关联
  await db.affiliateDomain.upsert({
    where: {
      affiliateId_domainId: {
        affiliateId: affiliate.id,
        domainId: domain.id,
      },
    },
    update: {},
    create: {
      affiliateId: affiliate.id,
      domainId: domain.id,
    },
  });

  await db.domainTemplate.upsert({
    where: { landingDomainId: domain.id },
    update: {
      templateCode: "A",
    },
    create: {
      landingDomainId: domain.id,
      templateCode: "A",
    },
  });

  await db.affiliateReturnUrl.upsert({
    where: {
      affiliateId_url: {
        affiliateId: affiliate.id,
        url: "https://aaa.com/complete",
      },
    },
    update: {
      isActive: true,
    },
    create: {
      affiliateId: affiliate.id,
      url: "https://aaa.com/complete",
      isActive: true,
    },
  });

  const stripeAccount = await db.stripeAccount.upsert({
    where: { id: "stripe_demo_001" },
    update: {
      accountLabel: "Demo Stripe",
      publishableKey: "pk_test_demo",
      secretKeyEncrypted: encryptValue("sk_test_demo"),
      webhookSecret: encryptValue("whsec_demo"),
      isActive: false,
    },
    create: {
      id: "stripe_demo_001",
      accountLabel: "Demo Stripe",
      publishableKey: "pk_test_demo",
      secretKeyEncrypted: encryptValue("sk_test_demo"),
      webhookSecret: encryptValue("whsec_demo"),
      isActive: false,
    },
  });

  // Link domain to stripe account
  await db.landingDomain.update({
    where: { id: domain.id },
    data: { stripeAccountId: stripeAccount.id },
  });

  const admin = await db.user.upsert({
    where: { email: "admin@shopa.local" },
    update: {
      displayName: "Demo Admin",
      role: UserRole.SUPER_ADMIN,
      passwordHash: hashPassword("Admin123456"),
    },
    create: {
      email: "admin@shopa.local",
      displayName: "Demo Admin",
      role: UserRole.SUPER_ADMIN,
      passwordHash: hashPassword("Admin123456"),
    },
  });

  const affiliateAdmin = await db.user.upsert({
    where: { email: "affiliate@shopa.local" },
    update: {
      displayName: "Demo Affiliate",
      role: UserRole.AFFILIATE_ADMIN,
      passwordHash: hashPassword("Affiliate123456"),
    },
    create: {
      email: "affiliate@shopa.local",
      displayName: "Demo Affiliate",
      role: UserRole.AFFILIATE_ADMIN,
      passwordHash: hashPassword("Affiliate123456"),
    },
  });

  await db.affiliateMembership.upsert({
    where: {
      userId_affiliateId: {
        userId: affiliateAdmin.id,
        affiliateId: affiliate.id,
      },
    },
    update: {},
    create: {
      userId: affiliateAdmin.id,
      affiliateId: affiliate.id,
    },
  });

  console.log("Seed complete");
  console.log(`Admin login: ${admin.email} / Admin123456`);
  console.log(`Affiliate login: ${affiliateAdmin.email} / Affiliate123456`);
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
