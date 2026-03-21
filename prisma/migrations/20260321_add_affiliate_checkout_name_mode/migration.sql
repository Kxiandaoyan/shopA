ALTER TABLE "LandingDomain"
ADD COLUMN "affiliateCheckoutNameMode" TEXT NOT NULL DEFAULT 'CATALOG_RANDOM';

ALTER TABLE "LandingDomain"
ADD COLUMN "affiliateCheckoutFixedName" TEXT;
