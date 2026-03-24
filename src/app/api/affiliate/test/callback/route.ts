import { NextResponse } from "next/server";
import { requireAffiliateAdminApi } from "@/lib/auth/api-access";
import { createAffiliateCallbackSignature } from "@/lib/affiliate/callback-signature";

export async function POST(request: Request) {
  const auth = await requireAffiliateAdminApi();

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ ok: false, message: "URL 参数缺失" }, { status: 400 });
  }

  // 验证 URL 格式
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ ok: false, message: "URL 格式不正确" }, { status: 400 });
  }

  // 模拟订单数据
  const ts = Math.floor(Date.now() / 1000).toString();
  const testPayload = {
    affiliateCode: auth.affiliate.code,
    orderId: `TEST_${Date.now()}`,
    externalOrderId: `EXT_TEST_${Date.now()}`,
    status: "PAID",
    ts,
  };

  // 生成签名 (使用测试密钥)
  const signature = createAffiliateCallbackSignature(
    testPayload,
    "test_callback_secret_for_debug"
  );

  // 构建测试 URL
  const testUrl = new URL(url);
  testUrl.searchParams.set("orderId", testPayload.orderId);
  testUrl.searchParams.set("externalOrderId", testPayload.externalOrderId);
  testUrl.searchParams.set("affiliateCode", testPayload.affiliateCode);
  testUrl.searchParams.set("status", testPayload.status);
  testUrl.searchParams.set("ts", testPayload.ts);
  testUrl.searchParams.set("sig", signature);

  return NextResponse.json({
    ok: true,
    testUrl: testUrl.toString(),
    message: "测试链接已生成，请在新窗口中打开",
    status: 200,
  });
}
