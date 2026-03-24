import Link from "next/link";
import { OrderCallbackActions } from "@/components/orders/order-callback-actions";
import { OrderNotePanel } from "@/components/orders/order-note-panel";
import { OrderPaymentActions } from "@/components/orders/order-payment-actions";
import type { OrderDetail } from "@/lib/orders/details";

type OrderDetailViewProps = {
  detail: OrderDetail;
  scope: "admin" | "affiliate";
};

type TimelineEntry = {
  id: string;
  at: string;
  category: string;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "danger";
};

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function JsonBlock({
  value,
  scope,
}: {
  value: string | null;
  scope: "admin" | "affiliate";
}) {
  if (!value) {
    return <div className="text-slate-500">N/A</div>;
  }

  const className =
    scope === "admin"
      ? "overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-200"
      : "overflow-x-auto rounded-2xl bg-stone-100 p-4 text-xs leading-6 text-slate-700";

  return <pre className={className}>{value}</pre>;
}

function buildBackHref(scope: "admin" | "affiliate") {
  return scope === "admin" ? "/admin/orders" : "/affiliate/orders";
}

function mapPaymentTone(status: string): TimelineEntry["tone"] {
  if (status === "PAID" || status === "SUCCEEDED") {
    return "success";
  }

  if (status === "FAILED" || status === "CANCELED" || status === "EXPIRED") {
    return "danger";
  }

  if (status === "REQUIRES_ACTION" || status === "PENDING") {
    return "warning";
  }

  return "neutral";
}

function mapLogTone(result: string, status: string | null): TimelineEntry["tone"] {
  if (result === "SUCCESS") {
    return "success";
  }

  if (result === "FAILURE" || status === "FAILED") {
    return "danger";
  }

  return "neutral";
}

function buildTimeline(detail: OrderDetail) {
  const entries: TimelineEntry[] = [
    {
      id: `order-created-${detail.id}`,
      at: detail.createdAt,
      category: "订单",
      title: "订单创建",
      detail: `订单已生成，当前状态 ${detail.status}，落地域名 ${detail.landingDomain.hostname}`,
      tone: "neutral",
    },
  ];

  if (detail.updatedAt !== detail.createdAt) {
    entries.push({
      id: `order-updated-${detail.id}`,
      at: detail.updatedAt,
      category: "订单",
      title: "订单更新",
      detail: `订单最近一次更新，当前状态 ${detail.status}`,
      tone: detail.status === "PAID" ? "success" : "neutral",
    });
  }

  for (const request of detail.intakeRequests) {
    entries.push({
      id: `intake-${request.id}`,
      at: request.createdAt,
      category: "接单",
      title: request.signatureValid ? "接单请求验签成功" : "接单请求验签失败",
      detail: `外部订单号 ${request.externalOrderId}，幂等键 ${request.idempotencyKey}`,
      tone: request.signatureValid ? "success" : "danger",
    });
  }

  for (const session of detail.paymentSessions) {
    entries.push({
      id: `payment-created-${session.id}`,
      at: session.createdAt,
      category: "支付",
      title: "Stripe 支付会话创建",
      detail: `${session.stripeAccountLabel}，状态 ${session.status}，金额 ${session.currency} ${session.amount.toFixed(2)}`,
      tone: mapPaymentTone(session.status),
    });

    if (session.updatedAt !== session.createdAt) {
      entries.push({
        id: `payment-updated-${session.id}`,
        at: session.updatedAt,
        category: "支付",
        title: "Stripe 支付会话更新",
        detail: `支付状态变更为 ${session.status}${session.stripePaymentIntentId ? `，Payment Intent ${session.stripePaymentIntentId}` : ""}`,
        tone: mapPaymentTone(session.status),
      });
    }
  }

  for (const log of detail.redirectLogs) {
    entries.push({
      id: `redirect-${log.id}`,
      at: log.createdAt,
      category: "链路",
      title: log.eventType,
      detail: `${log.result}${log.status ? ` / ${log.status}` : ""}${log.message ? ` / ${log.message}` : ""}`,
      tone: mapLogTone(log.result, log.status),
    });
  }

  return entries.sort(
    (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
  );
}

function buildToneClass(scope: "admin" | "affiliate", tone: TimelineEntry["tone"]) {
  const adminClasses: Record<TimelineEntry["tone"], string> = {
    neutral: "border-white/10 bg-white/5 text-slate-200",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-100",
  };
  const affiliateClasses: Record<TimelineEntry["tone"], string> = {
    neutral: "border-stone-200 bg-stone-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return scope === "admin" ? adminClasses[tone] : affiliateClasses[tone];
}

export function OrderDetailView({ detail, scope }: OrderDetailViewProps) {
  const shellClass =
    scope === "admin"
      ? ""
      : "min-h-screen bg-stone-100 px-8 py-10 text-slate-900";
  const panelClass =
    scope === "admin"
      ? "rounded-[1.8rem] border border-white/10 bg-white/5 p-6"
      : "rounded-[1.8rem] border border-stone-200 bg-white p-6";
  const subtleClass = scope === "admin" ? "text-slate-400" : "text-slate-500";
  const bodyClass = scope === "admin" ? "text-slate-300" : "text-slate-700";
  const tableClass =
    scope === "admin"
      ? "min-w-full text-left text-sm text-slate-200"
      : "min-w-full text-left text-sm text-slate-700";
  const backHref = buildBackHref(scope);
  const timeline = buildTimeline(detail);

  const content = (
    <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.24em] ${subtleClass}`}>订单详情</div>
            <h1 className="mt-3 text-3xl">{detail.id}</h1>
            <p className={`mt-2 text-sm ${subtleClass}`}>
              外部订单号：{detail.externalOrderId} / 当前状态：{detail.status}
            </p>
          </div>
          <Link
            href={backHref}
            className={
              scope === "admin"
                ? "rounded-full border border-white/10 px-4 py-2 text-sm text-white"
                : "rounded-full border border-stone-300 px-4 py-2 text-sm"
            }
          >
            返回订单列表
          </Link>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className={panelClass}>
              <div className="text-lg">订单概览</div>
              <div className={`mt-4 grid gap-4 text-sm ${bodyClass} md:grid-cols-2`}>
                <div>
                  金额：{detail.currency} {detail.totalAmount.toFixed(2)}
                </div>
                <div>创建时间：{formatDateTime(detail.createdAt)}</div>
                <div>更新时间：{formatDateTime(detail.updatedAt)}</div>
                <div>Token：{detail.token}</div>
                <div>
                  分销商：{detail.affiliate.name} ({detail.affiliate.code})
                </div>
                <div>落地域名：{detail.landingDomain.hostname}</div>
                <div className="md:col-span-2">回跳地址：{detail.returnUrl ?? "无"}</div>
              </div>
            </div>

            {scope === "admin" ? (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <OrderPaymentActions
                    orderId={detail.id}
                    orderStatus={detail.status}
                    paymentSessionCount={detail.paymentSessions.length}
                  />
                  <OrderCallbackActions
                    orderId={detail.id}
                    orderStatus={detail.status}
                    returnUrl={detail.returnUrl}
                    asyncWebhookEndpointCount={detail.affiliate.webhookEndpointCount}
                  />
                </div>
                <OrderNotePanel orderId={detail.id} notes={detail.internalNotes} />
              </>
            ) : null}

            <div className={panelClass}>
              <div className="text-lg">订单时间线</div>
              <div className="mt-4 space-y-4">
                {timeline.map((entry) => (
                  <article
                    key={entry.id}
                    className={`rounded-2xl border p-4 ${buildToneClass(scope, entry.tone)}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]">
                          {entry.category}
                        </span>
                        <div className="text-sm font-medium">{entry.title}</div>
                      </div>
                      <div className={`text-xs ${subtleClass}`}>{formatDateTime(entry.at)}</div>
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${bodyClass}`}>{entry.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className={panelClass}>
              <div className="text-lg">买家与收货地址</div>
              <div className={`mt-4 grid gap-4 text-sm ${bodyClass} md:grid-cols-2`}>
                <div>
                  姓名：{detail.buyer.firstName} {detail.buyer.lastName}
                </div>
                <div>邮箱：{detail.buyer.email}</div>
                <div>电话：{detail.buyer.phone}</div>
                <div>国家：{detail.buyer.country}</div>
                <div>州 / 地区：{detail.buyer.state}</div>
                <div>城市：{detail.buyer.city}</div>
                <div>地址一：{detail.buyer.address1}</div>
                <div>地址二：{detail.buyer.address2 || "无"}</div>
                <div>邮编：{detail.buyer.postalCode}</div>
              </div>
            </div>

            <div className={panelClass}>
              <div className="text-lg">商品明细</div>
              <div className="mt-4 overflow-x-auto">
                <table className={tableClass}>
                  <thead className={subtleClass}>
                    <tr>
                      <th className="px-3 py-3">商品</th>
                      <th className="px-3 py-3">数量</th>
                      <th className="px-3 py-3">单价</th>
                      <th className="px-3 py-3">Product ID</th>
                      <th className="px-3 py-3">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          scope === "admin"
                            ? "border-t border-white/10 align-top"
                            : "border-t border-stone-200 align-top"
                        }
                      >
                        <td className="px-3 py-3">{item.productName}</td>
                        <td className="px-3 py-3">{item.quantity}</td>
                        <td className="px-3 py-3">
                          {detail.currency} {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">{item.productId ?? "无"}</td>
                        <td className="px-3 py-3">
                          <JsonBlock value={item.metadata} scope={scope} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className={panelClass}>
              <div className="text-lg">支付会话</div>
              <div className="mt-4 space-y-4">
                {detail.paymentSessions.length === 0 ? (
                  <div className={subtleClass}>暂无支付会话。</div>
                ) : (
                  detail.paymentSessions.map((session) => (
                    <article
                      key={session.id}
                      className={
                        scope === "admin"
                          ? "rounded-2xl border border-white/10 bg-black/10 p-4"
                          : "rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">{session.status}</div>
                        <div className={`text-xs ${subtleClass}`}>
                          {formatDateTime(session.createdAt)}
                        </div>
                      </div>
                      <div className={`mt-3 grid gap-2 text-sm ${bodyClass}`}>
                        <div>
                          金额：{session.currency} {session.amount.toFixed(2)}
                        </div>
                        <div>Stripe 账号：{session.stripeAccountLabel}</div>
                        <div>Session ID：{session.stripeSessionId ?? "N/A"}</div>
                        <div>
                          Payment Intent：{session.stripePaymentIntentId ?? "N/A"}
                        </div>
                        <div>更新时间：{formatDateTime(session.updatedAt)}</div>
                      </div>
                      <div className="mt-3">
                        <JsonBlock value={session.metadata} scope={scope} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className={panelClass}>
              <div className="text-lg">接单请求</div>
              <div className="mt-4 space-y-4">
                {detail.intakeRequests.length === 0 ? (
                  <div className={subtleClass}>暂无接单请求记录。</div>
                ) : (
                  detail.intakeRequests.map((request) => (
                    <article
                      key={request.id}
                      className={
                        scope === "admin"
                          ? "rounded-2xl border border-white/10 bg-black/10 p-4"
                          : "rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          {request.signatureValid ? "签名有效" : "签名无效"}
                        </div>
                        <div className={`text-xs ${subtleClass}`}>
                          {formatDateTime(request.createdAt)}
                        </div>
                      </div>
                      <div className={`mt-3 grid gap-2 text-sm ${bodyClass}`}>
                        <div>Affiliate Code：{request.affiliateCode}</div>
                        <div>外部订单号：{request.externalOrderId}</div>
                        <div>Nonce：{request.nonce}</div>
                        <div>幂等键：{request.idempotencyKey}</div>
                        <div>请求时间戳：{request.requestTimestamp}</div>
                        <div>失败原因：{request.failureReason ?? "无"}</div>
                      </div>
                      <div className="mt-3">
                        <JsonBlock value={request.requestBody} scope={scope} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className={panelClass}>
              <div className="text-lg">链路日志</div>
              <div className="mt-4 space-y-4">
                {detail.redirectLogs.length === 0 ? (
                  <div className={subtleClass}>暂无链路日志。</div>
                ) : (
                  detail.redirectLogs.map((log) => (
                    <article
                      key={log.id}
                      className={
                        scope === "admin"
                          ? "rounded-2xl border border-white/10 bg-black/10 p-4"
                          : "rounded-2xl border border-stone-200 bg-stone-50 p-4"
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm">{log.eventType}</div>
                        <div className={`text-xs ${subtleClass}`}>
                          {formatDateTime(log.createdAt)}
                        </div>
                      </div>
                      <div className={`mt-3 grid gap-2 text-sm ${bodyClass}`}>
                        <div>结果：{log.result}</div>
                        <div>状态：{log.status ?? "N/A"}</div>
                        <div>请求地址：{log.requestUrl ?? "N/A"}</div>
                        <div>消息：{log.message ?? "N/A"}</div>
                      </div>
                      <div className="mt-3">
                        <JsonBlock value={log.metadata} scope={scope} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );

  if (scope === "admin") {
    return content;
  }

  return <main className={shellClass}>{content}</main>;
}
