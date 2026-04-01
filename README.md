# Shopa - Stripe 支付网关

一个 **Stripe 支付中转服务**，为多个商户网站提供统一的支付入口。

## 它是什么？

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  商户网站 A  │────────▶│             │────────▶│             │
└─────────────┘         │   Shopa     │         │   Stripe    │
┌─────────────┐         │  支付网关    │────────▶│   Checkout  │
│  商户网站 B  │────────▶│             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
                               │                       │
                               │◀──────────────────────│
                               │   Webhook 回调         │
                               │                       │
                               ▼                       │
                        ┌─────────────┐               │
                        │  带签名回跳  │───────────────┘
                        │  到商户网站  │
                        └─────────────┘
```

**简单说**：商户网站把订单推过来，Shopa 负责 Stripe 支付，完成后带签名回跳。

## 核心流程

```
商户网站                     Shopa 网关                    Stripe
   │                            │                           │
   │  1. 推送订单 (签名)         │                           │
   │───────────────────────────▶│                           │
   │                            │                           │
   │  2. 返回支付链接            │                           │
   │◀───────────────────────────│                           │
   │                            │                           │
   │  3. 用户跳转到落地页        │                           │
   │───────────────────────────▶│                           │
   │                            │  4. 创建 Checkout Session  │
   │                            │──────────────────────────▶│
   │                            │                           │
   │                            │  5. 跳转到 Stripe 支付     │
   │                            │◀──────────────────────────│
   │                            │                           │
   │                            │  6. 用户完成支付           │
   │                            │◀──────────────────────────│
   │                            │                           │
   │                            │  7. Webhook 通知           │
   │                            │◀──────────────────────────│
   │                            │                           │
   │  8. 带签名回跳到商户        │                           │
   │◀───────────────────────────│                           │
   │  (orderId, status, sig)    │                           │
   │                            │                           │
```

## 使用场景

### 1. 多商户聚合支付
- 你有多个电商网站/独立站，但只想用同一个 Stripe 账号
- 每个网站作为独立"商户"，订单统一中转处理

### 2. 代理收单服务
- 为没有 Stripe 账号的客户提供支付通道
- 客户只需对接 API，无需处理 Stripe 接入

### 3. 多品牌/多站点统一管理
- 运营多个品牌站点，每站独立域名和模板
- 统一管理支付、订单、对账

### 4. 跨境电商中转
- 国内商户通过中转服务接入 Stripe
- 落地域名可配置不同模板适配不同市场

## 技术栈

| 组件 | 技术 |
|------|------|
| 框架 | Next.js 16 |
| 语言 | TypeScript |
| 数据库 | SQLite / PostgreSQL |
| ORM | Prisma 7 |
| 支付 | Stripe Checkout |
| 认证 | NextAuth.js |

## 目录结构

```
shopa/
├── src/
│   ├── app/
│   │   ├── admin/           # 网关管理后台
│   │   │   ├── merchants/   # 商户管理
│   │   │   ├── domains/     # 落地域名管理
│   │   │   ├── stripe/      # Stripe 账号管理
│   │   │   └── orders/      # 订单管理
│   │   ├── merchant/        # 商户自助后台
│   │   ├── api/
│   │   │   ├── intake/      # 订单接收 API
│   │   │   └── stripe/      # Stripe Webhook
│   │   └── checkout/        # 支付页面
│   └── lib/                 # 业务逻辑
├── prisma/                  # 数据库 Schema
├── docs/                    # 文档
└── scripts/                 # 脚本
```

## 快速开始

### 1. 安装

```bash
git clone https://github.com/your-repo/shopa.git
cd shopa
npm install
```

### 2. 配置环境变量

创建 `.env`：

```env
DATABASE_URL=file:./dev.db
AUTH_SECRET=至少32字符的随机字符串
NEXTAUTH_URL=http://localhost:3000
INTAKE_TOKEN_SECRET=商户推送订单用的token
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

---

## 后台配置

配置顺序：**商户 → 域名 → Stripe**

### 1. 添加商户

路径：**后台 → 商户管理**

- 商户名称：如 "XX商城"
- 系统自动生成商户编码和密钥
- 商户可登录自己的后台配置回跳地址

### 2. 添加落地域名

路径：**后台 → 域名管理**

- 域名：如 `pay.example.com`
- 分配给哪些商户使用
- 选择模板（A/B/C）

### 3. 配置 Stripe

路径：**后台 → Stripe 管理**

**步骤一**：创建 Stripe 账号
- 填写标签
- 选择要绑定的域名
- 创建

**步骤二**：配置 Webhook
- 复制显示的 Webhook URL
- 到 Stripe Dashboard → Webhooks → 添加 endpoint
- 选择事件：`checkout.session.completed`、`payment_intent.succeeded` 等
- 复制 Signing secret

**步骤三**：完善配置
- 编辑 Stripe 账号
- 填入 Secret Key 和 Webhook Secret

---

## 商户对接

商户通过 API 推送订单到网关。

### 请求示例

```http
POST /api/intake/orders
Content-Type: application/json
X-Intake-Token: <商户token>
X-Signature: <HMAC-SHA256签名>
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
  "landingUrl": "https://pay.example.com/checkout?token=xxx"
}
```

### 回跳

支付完成后，网关带签名回跳到商户：

```
https://merchant.com/callback?orderId=xxx&status=PAID&ts=1234567890&sig=xxx
```

商户可验证签名确保回调真实性。

---

## 部署

详见 [docs/deployment.md](docs/deployment.md)

生产环境检查：
- [ ] PostgreSQL 数据库
- [ ] HTTPS 配置
- [ ] 域名 DNS 解析
- [ ] Stripe Live Mode 密钥

---

## License

UNLICENSED
