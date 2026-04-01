# Shopa - Stripe 多账号支付网关

一个 **Stripe 账号分流系统**，支持多个 Stripe 账号轮转收款，为商户网站提供统一的支付入口。

## 核心特点

**多 Stripe 账号分流** — 同时接入多个 Stripe 账号，不同域名/商户走不同账号收款

```
                            ┌──▶ Stripe 账号 A (主账号)
                            │
商户网站 ──▶ Shopa 网关 ────┼──▶ Stripe 账号 B (备用)
                            │
                            └──▶ Stripe 账号 C (特定业务)
```

## 为什么需要这个？

| 场景 | 说明 |
|------|------|
| **风险分散** | 多个账号分摊收款，避免单一账号出问题导致业务中断 |
| **流量分流** | 订单分散到不同账号，降低单账号风控触发概率 |
| **业务隔离** | 不同类型业务走不同账号，账目清晰 |
| **灵活切换** | 账号异常时可快速切换，无需改商户代码 |
| **聚合管理** | 商户只需对接一个 API，后台自动路由到对应 Stripe |

## 工作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              完整支付流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  商户网站                    Shopa 网关                     Stripe          │
│      │                          │                            │              │
│      │  1. 推送订单              │                            │              │
│      │  (商户编码 + 签名)        │                            │              │
│      │─────────────────────────▶│                            │              │
│      │                          │                            │              │
│      │  2. 返回支付链接          │                            │              │
│      │  (分配域名 + Stripe账号) │                            │              │
│      │◀─────────────────────────│                            │              │
│      │                          │                            │              │
│      │         3. 用户访问落地域名                           │              │
│      │─────────────────────────▶│                            │              │
│      │                          │                            │              │
│      │                          │  4. 创建 Checkout Session   │              │
│      │                          │  (使用该域名绑定的 Stripe)  │              │
│      │                          │───────────────────────────▶│              │
│      │                          │                            │              │
│      │                          │  5. 跳转 Stripe 支付页面    │              │
│      │                          │◀───────────────────────────│              │
│      │                          │                            │              │
│      │                          │  6. 用户完成支付            │              │
│      │                          │                            │              │
│      │                          │  7. Webhook 回调            │              │
│      │                          │◀───────────────────────────│              │
│      │                          │                            │              │
│      │  8. 带签名回跳到商户      │                            │              │
│      │◀─────────────────────────│                            │              │
│      │  (订单号 + 状态 + 签名)   │                            │              │
│      │                          │                            │              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 使用场景

### 1. Stripe 账号轮转/分流
- 配置多个 Stripe 账号，订单自动分配到不同账号
- 单账号收款额过大时，分流降低风控风险

### 2. 多业务线隔离
- 不同业务用不同 Stripe 账号
- 便于对账和财务核算

### 3. 容灾备份
- 主账号异常时，快速切到备用账号
- 只需在后台重新绑定域名，商户代码无需改动

### 4. 代理收单
- 为多个客户提供支付通道
- 每个客户可分配独立域名和 Stripe 账号

## 架构图

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           Shopa 网关架构                                    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│   │  商户 A      │  │  商户 B      │  │  商户 C      │                      │
│   │  (网站/APP)  │  │  (网站/APP)  │  │  (网站/APP)  │                      │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│          │                │                │                              │
│          └────────────────┼────────────────┘                              │
│                           │                                                │
│                           ▼                                                │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │                        订单接收 API                                 │   │
│   │                    (签名验证 + 域名分配)                            │   │
│   └───────────────────────────────────────────────────────────────────┘   │
│                           │                                                │
│                           ▼                                                │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│   │  落地域名 A  │  │  落地域名 B  │  │  落地域名 C  │                      │
│   │ pay-a.com   │  │ pay-b.com   │  │ pay-c.com   │                      │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                      │
│          │                │                │                              │
│          ▼                ▼                ▼                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│   │ Stripe #1   │  │ Stripe #2   │  │ Stripe #3   │                      │
│   │ (主账号)     │  │ (备用)      │  │ (特定业务)  │                      │
│   └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Next.js 16 |
| 语言 | TypeScript |
| 数据库 | SQLite / PostgreSQL |
| ORM | Prisma 7 |
| 支付 | Stripe Checkout |
| 认证 | NextAuth.js |

---

## 快速开始

### 1. 安装

```bash
git clone https://github.com/your-repo/shopa.git
cd shopa
npm install
```

### 2. 配置 .env

```env
DATABASE_URL=file:./dev.db
AUTH_SECRET=至少32字符随机字符串
NEXTAUTH_URL=http://localhost:3000
INTAKE_TOKEN_SECRET=商户推送token
INTAKE_SIGNATURE_SECRET=签名密钥
STRIPE_SECRET_ENCRYPTION_KEY=32字符加密密钥
```

### 3. 初始化

```bash
npm run db:push
npm run seed:products
npm run seed:dev
```

### 4. 创建管理员

```bash
# Windows
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="your-password"
npm run admin:create

# Linux/macOS
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your-password npm run admin:create
```

### 5. 启动

```bash
npm run dev
```

访问 http://localhost:3000/login

---

## 后台配置

配置顺序：**商户 → 域名 → Stripe 账号**

### 1. 添加商户

**后台 → 商户管理 → 新增**

- 商户名称（如：XX商城）
- 系统自动生成编码和密钥
- 商户可登录自己的后台配置回跳地址

### 2. 添加域名

**后台 → 域名管理 → 新增**

| 字段 | 说明 |
|------|------|
| 域名 | 落地域名，如 `pay-a.example.com` |
| 商户 | 可分配给多个商户 |
| 模板 | A/B/C 三套可选 |

**注意**：Stripe 绑定在「Stripe 管理」中配置

### 3. 配置 Stripe 账号

**后台 → Stripe 管理 → 新增**

**步骤一：创建账号**
- 填写标签（如：主账号、备用账号）
- 选择要绑定的域名
- 点击创建

**步骤二：配置 Webhook**

创建后系统显示 Webhook URL：
```
https://pay-a.example.com/api/stripe/webhooks/cm_xxx
```

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. Developers → Webhooks → Add endpoint
3. 填入 URL，选择事件：
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. 复制 Signing secret

**步骤三：完善配置**
- 回到 Stripe 管理编辑账号
- 填入 Secret Key 和 Webhook Secret

---

## 商户对接

商户通过 API 推送订单。

### 请求

```http
POST /api/intake/orders
Content-Type: application/json
X-Intake-Token: <商户token>
X-Signature: <HMAC-SHA256>
X-Timestamp: <时间戳>
X-Nonce: <随机串>

{
  "merchantCode": "M001",
  "externalOrderId": "ORDER-123",
  "buyerEmail": "buyer@example.com",
  "buyerFirstName": "John",
  "buyerLastName": "Doe",
  "country": "US",
  "state": "CA",
  "city": "Los Angeles",
  "address1": "123 Main St",
  "postalCode": "90001",
  "items": [{
    "productName": "Product A",
    "quantity": 1,
    "unitPrice": 99.00
  }],
  "totalAmount": 99.00,
  "currency": "USD",
  "returnUrl": "https://merchant.com/callback"
}
```

### 响应

```json
{
  "ok": true,
  "landingUrl": "https://pay-a.example.com/checkout?token=xxx"
}
```

### 支付完成回跳

```
https://merchant.com/callback?orderId=xxx&status=PAID&ts=1234567890&sig=xxx
```

商户可验证签名确认支付结果。

---

## 部署

详见 [docs/deployment.md](docs/deployment.md)

生产检查：
- [ ] PostgreSQL
- [ ] HTTPS
- [ ] 域名 DNS
- [ ] Stripe Live Mode

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [deployment.md](docs/deployment.md) | 部署指南 |
| [stripe-setup.md](docs/stripe-setup.md) | Stripe 配置 |
| [partner-integration/](docs/partner-integration/) | 商户对接 |

---

## License

UNLICENSED
