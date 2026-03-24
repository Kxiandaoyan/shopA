import { NextResponse } from "next/server";
import { requireAffiliateAdminApi } from "@/lib/auth/api-access";

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

  // 模拟订单终态通知
  const testPayload = {
    event: "order.paid",
    timestamp: new Date().toISOString(),
    data: {
      orderId: `TEST_${Date.now()}`,
      externalOrderId: `EXT_TEST_${Date.now()}`,
      affiliateCode: "TEST_AFFILIATE",
      status: "PAID",
      amount: 99.99,
      currency: "USD",
      buyerEmail: "test@example.com",
      buyerName: "Test Buyer",
      landingDomain: "test.example.com",
      paidAt: new Date().toISOString(),
    },
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test-Mode": "true",
      },
      body: JSON.stringify(testPayload),
    });

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      responseStatus: response.status,
      responseTime,
      message: `Webhook 测试已发送，响应状态: ${response.status}，耗时: ${responseTime}ms`,
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      ok: false,
      message: `Webhook 发送失败: ${error instanceof Error ? error.message : "未知错误"}`,
      responseTime,
    });
  }
}
