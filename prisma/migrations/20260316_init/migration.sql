-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'AFFILIATE_ADMIN');

-- CreateEnum
CREATE TYPE "DomainTemplateCode" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'LANDING_VISITED', 'CHECKOUT_CREATED', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "LogResult" AS ENUM ('SUCCESS', 'FAILURE', 'INFO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callbackSecretEncrypted" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingDomain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "affiliateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainTemplate" (
    "id" TEXT NOT NULL,
    "landingDomainId" TEXT NOT NULL,
    "templateCode" "DomainTemplateCode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeAccount" (
    "id" TEXT NOT NULL,
    "landingDomainId" TEXT NOT NULL,
    "accountLabel" TEXT NOT NULL,
    "publishableKey" TEXT,
    "secretKeyEncrypted" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "landingDomainId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerFirstName" TEXT NOT NULL,
    "buyerLastName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "postalCode" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "returnUrl" TEXT,
    "token" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "affiliateCode" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "requestTimestamp" INTEGER NOT NULL,
    "requestBody" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateReturnUrl" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateReturnUrl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "result" "LogResult" NOT NULL DEFAULT 'INFO',
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedirectLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "landingDomainId" TEXT,
    "eventType" TEXT NOT NULL,
    "result" "LogResult" NOT NULL DEFAULT 'INFO',
    "status" TEXT,
    "requestUrl" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedirectLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_code_key" ON "Affiliate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateMembership_userId_affiliateId_key" ON "AffiliateMembership"("userId", "affiliateId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingDomain_hostname_key" ON "LandingDomain"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "DomainTemplate_landingDomainId_key" ON "DomainTemplate"("landingDomainId");

-- CreateIndex
CREATE UNIQUE INDEX "StripeAccount_landingDomainId_key" ON "StripeAccount"("landingDomainId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_token_key" ON "Order"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Order_affiliateId_externalOrderId_key" ON "Order"("affiliateId", "externalOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_stripeSessionId_key" ON "PaymentSession"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_stripePaymentIntentId_key" ON "PaymentSession"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeRequest_affiliateCode_nonce_key" ON "IntakeRequest"("affiliateCode", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateReturnUrl_affiliateId_url_key" ON "AffiliateReturnUrl"("affiliateId", "url");

-- AddForeignKey
ALTER TABLE "AffiliateMembership" ADD CONSTRAINT "AffiliateMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateMembership" ADD CONSTRAINT "AffiliateMembership_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandingDomain" ADD CONSTRAINT "LandingDomain_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainTemplate" ADD CONSTRAINT "DomainTemplate_landingDomainId_fkey" FOREIGN KEY ("landingDomainId") REFERENCES "LandingDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripeAccount" ADD CONSTRAINT "StripeAccount_landingDomainId_fkey" FOREIGN KEY ("landingDomainId") REFERENCES "LandingDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_landingDomainId_fkey" FOREIGN KEY ("landingDomainId") REFERENCES "LandingDomain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_stripeAccountId_fkey" FOREIGN KEY ("stripeAccountId") REFERENCES "StripeAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeRequest" ADD CONSTRAINT "IntakeRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateReturnUrl" ADD CONSTRAINT "AffiliateReturnUrl_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedirectLog" ADD CONSTRAINT "RedirectLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedirectLog" ADD CONSTRAINT "RedirectLog_landingDomainId_fkey" FOREIGN KEY ("landingDomainId") REFERENCES "LandingDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
