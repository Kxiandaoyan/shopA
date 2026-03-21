import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/orders/order-detail-view";
import { loadAdminOrderDetail } from "@/lib/orders/details";
import { requireSuperAdmin } from "@/lib/auth/access";

type AdminOrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  await requireSuperAdmin();
  const { orderId } = await params;
  const detail = await loadAdminOrderDetail(orderId);

  if (!detail) {
    notFound();
  }

  return <OrderDetailView detail={detail} scope="admin" />;
}
