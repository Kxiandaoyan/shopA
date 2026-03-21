-- CreateEnum
CREATE TYPE "WebhookDispatchMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "AffiliateWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateWebhookDispatch" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "callbackStatus" TEXT NOT NULL,
    "dispatchMode" "WebhookDispatchMode" NOT NULL,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "responseStatus" INTEGER,
    "requestUrl" TEXT NOT NULL,
    "requestBody" JSONB NOT NULL,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateWebhookDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateWebhookEndpoint_affiliateId_url_key" ON "AffiliateWebhookEndpoint"("affiliateId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateWebhookDispatch_orderId_endpointId_callbackStatus_dispatchMode_key" ON "AffiliateWebhookDispatch"("orderId", "endpointId", "callbackStatus", "dispatchMode");

-- CreateIndex
CREATE INDEX "AffiliateWebhookDispatch_orderId_createdAt_idx" ON "AffiliateWebhookDispatch"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateWebhookDispatch_endpointId_createdAt_idx" ON "AffiliateWebhookDispatch"("endpointId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateWebhookDispatch_callbackStatus_createdAt_idx" ON "AffiliateWebhookDispatch"("callbackStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "AffiliateWebhookEndpoint" ADD CONSTRAINT "AffiliateWebhookEndpoint_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateWebhookDispatch" ADD CONSTRAINT "AffiliateWebhookDispatch_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateWebhookDispatch" ADD CONSTRAINT "AffiliateWebhookDispatch_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "AffiliateWebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
