import { ProductManagementPanel } from "@/components/admin/product-management-panel";
import { loadAdminProductSummaries } from "@/lib/admin/dashboard";
import { requireSuperAdmin } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireSuperAdmin();
  const products = await loadAdminProductSummaries();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">商品管理</div>
      <h1 className="mt-3 text-3xl">维护站内商品资料</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
        商品内容可以直接在后台维护。TXT 仍可用于初始化入库，但后续以数据库中的商品资料为准。
      </p>

      <ProductManagementPanel products={products} />
    </div>
  );
}
