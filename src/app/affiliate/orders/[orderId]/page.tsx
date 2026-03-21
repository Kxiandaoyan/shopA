import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/orders/order-detail-view";
import { requireAffiliateAdmin } from "@/lib/auth/access";
import { loadAffiliateOrderDetail } from "@/lib/orders/details";

type AffiliateOrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function AffiliateOrderDetailPage({
  params,
}: AffiliateOrderDetailPageProps) {
  const session = await requireAffiliateAdmin();
  const { orderId } = await params;
  const detail = await loadAffiliateOrderDetail(orderId, session.affiliateIds);

  if (!detail) {
    notFound();
  }

  return <OrderDetailView detail={detail} scope="affiliate" />;
}
