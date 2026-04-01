# Shopa

多租户 B2C 商城 SaaS 系统，支持多域名、多模板、分销商体系和 Stripe 支付。

## 核心特性

- **多域名部署** - 每个域名独立配置，支持 A/B/C 三套前端模板
- **Stripe 支付集成** - 每个域名绑定独立的 Stripe 账号，支持 Hosted Checkout
- **分销商系统** - 完整的分销商管理、订单归因、回跳签名验证
- **订单管理** - 订单状态追踪、异常检测、Webhook 回调
- **多语言支持** - 前端英文，后台中文

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| ORM | Prisma 7 |
| 支付 | Stripe Checkout |
| 认证 | NextAuth.js |
| 样式 | Tailwind CSS 4 |
| 测试 | Vitest |

## 项目架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Shopa 系统架构                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  分销商系统  │    │  后台管理    │    │  用户前台    │                     │
│  │  /affiliate │    │   /admin    │    │   / (域名)   │                     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│         │                  │                  │                             │
│         └──────────────────┼──────────────────┘                             │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API 层 (/api)                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │   Intake    │  │   Admin     │  │   Stripe    │  │  Affiliate │ │   │
│  │  │   订单接收   │  │   管理接口   │  │   Webhook   │  │   回调接口  │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        业务逻辑层                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │   │
│  │  │ 订单处理    │  │ 支付会话    │  │ 签名验证    │  │ 日志审计   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                            │                                                │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        数据层 (Prisma)                                │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │   │
│  │  │ User   │ │Affiliate│ │Domain  │ │ Order  │ │Payment │ │Stripe  │ │   │
│  │  │ 用户   │ │ 分销商  │ │ 域名   │ │ 订单   │ │ Session│ │ Account│ │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心流程

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  分销商   │────▶│  落地域名 │────▶│  支付页面 │────▶│  支付回调 │────▶│  返回商户 │
│  推送订单 │     │  (跳转)   │     │ (Stripe) │     │  (记录)   │     │  (签名)   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
      │                │                │                │                │
      │                │                │                │                │
      ▼                ▼                ▼                ▼                ▼
  验证签名         分配域名         创建 Session     Webhook 更新      带签名回跳
  检查白名单       记录访问         获取 Stripe      订单状态          ts + sig
```

## 目录结构

```
shopa/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # 超级管理员后台
│   │   │   ├── affiliates/     # 分销商管理
│   │   │   ├── domains/        # 域名管理
│   │   │   ├── stripe/         # Stripe 账号管理
│   │   │   ├── orders/         # 订单管理
│   │   │   └── ...
│   │   ├── affiliate/          # 分销商后台
│   │   ├── api/                # API 路由
│   │   │   ├── intake/         # 订单接收接口
│   │   │   ├── admin/          # 管理接口
│   │   │   └── stripe/         # Stripe Webhook
│   │   └── [domain]/           # 动态域名 storefront
│   ├── components/             # React 组件
│   ├── lib/                    # 业务逻辑
│   │   ├── admin/              # 后台逻辑
│   │   ├── stripe/             # Stripe 集成
│   │   ├── auth/               # 认证授权
│   │   └── ...
│   └── prisma/                 # 数据库
├── prisma/
│   ├── schema.prisma           # SQLite schema
│   └── schema.postgresql.prisma # PostgreSQL schema
├── docs/                       # 文档
├── scripts/                    # 脚本
└── tests/                      # 测试
```

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/your-repo/shopa.git
cd shopa

# 安装依赖
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 数据库
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./dev.db

# 认证
AUTH_SECRET=your-auth-secret-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000
APP_INTERNAL_BASE_URL=http://localhost:3000

# 签名密钥
INTAKE_TOKEN_SECRET=your-intake-token-secret
INTAKE_SIGNATURE_SECRET=your-signature-secret

# Stripe 密钥加密
STRIPE_SECRET_ENCRYPTION_KEY=your-32-char-encryption-key
```

### 3. 初始化数据库

```bash
# 使用 SQLite（开发环境）
npm run db:use:sqlite
npm run db:push

# 填充示例数据
npm run seed:products
npm run seed:dev
```

### 4. 创建管理员

```bash
# Windows PowerShell
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="YourStrongPassword"
$env:ADMIN_NAME="Admin"
npm run admin:create

# Linux/macOS
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=YourStrongPassword ADMIN_NAME=Admin npm run admin:create
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000/login 登录后台。

---

## 后台配置指南

### 配置顺序

按以下顺序配置系统：

```
1. 分销商 → 2. 域名 → 3. Stripe 账号 → 4. 测试
```

### 1. 创建分销商

路径：**后台 → 分销商管理**

- 填写分销商名称
- 系统自动生成 `code`（分销商编码）和密钥
- 分销商可登录自己的后台配置回跳地址和 Webhook

### 2. 添加域名

路径：**后台 → 域名管理**

| 字段 | 说明 |
|------|------|
| 域名 | 落地域名，如 `pay.example.com` |
| 标签 | 自定义名称，便于识别 |
| 分销商 | 可分配给多个分销商 |
| 模板 | A/B/C 三套模板可选 |

**注意**：域名的 Stripe 绑定在 Stripe 账号管理中进行。

### 3. 配置 Stripe 账号

路径：**后台 → Stripe 管理**

#### 步骤一：创建 Stripe 账号

1. 填写 **账号标签**（如：主账号）
2. **选择要绑定的域名**（可多选）
3. 点击 **创建账号**

#### 步骤二：配置 Webhook

创建成功后，系统会显示完整的 Webhook URL：

```
https://pay.example.com/api/stripe/webhooks/cm_xxx
```

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers → Webhooks → Add endpoint**
3. 填入上述 Webhook URL
4. 选择以下事件：
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. 创建后，复制 **Signing secret**（以 `whsec_` 开头）

#### 步骤三：完善 Stripe 配置

1. 回到 **Stripe 管理** 页面
2. 选择刚创建的账号进行编辑
3. 填入：
   - **Secret Key**（`sk_test_...` 或 `sk_live_...`）
   - **Webhook Secret**（刚才复制的 `whsec_...`）
4. 保存

### 4. 流程验证

```
┌─────────────────────────────────────────────────────────────────┐
│                       配置关系图                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   分销商 A ─────┐                                               │
│                 │                                               │
│   分销商 B ─────┼────▶  域名 pay.example.com ────▶ Stripe 账号   │
│                 │           │                        │          │
│   分销商 C ─────┘           │                        │          │
│                             ▼                        ▼          │
│                      落地页模板                  Webhook 接收    │
│                        (A/B/C)                     支付回调      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 分销商对接

分销商通过 API 推送订单，详见 [docs/partner-integration/README.md](docs/partner-integration/README.md)。

### 请求示例

```bash
POST /api/intake/orders
Content-Type: application/json
X-Intake-Token: <token>
X-Signature: <hmac-sha256>
X-Timestamp: <unix-timestamp>
X-Nonce: <random-string>

{
  "affiliateCode": "DIST001",
  "externalOrderId": "ORDER-123",
  "buyerEmail": "buyer@example.com",
  "buyerFirstName": "John",
  "buyerLastName": "Doe",
  "buyerPhone": "+1234567890",
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
  "returnUrl": "https://merchant.example.com/callback"
}
```

---

## 部署

详见 [docs/deployment.md](docs/deployment.md)。

### 生产环境检查清单

- [ ] 使用 PostgreSQL 数据库
- [ ] 设置 `DATABASE_PROVIDER=postgresql`
- [ ] 配置正确的 `DATABASE_URL`
- [ ] 使用强密码和密钥
- [ ] Stripe 使用 Live Mode 密钥
- [ ] 配置 HTTPS
- [ ] 配置域名 DNS

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [deployment.md](docs/deployment.md) | 部署指南 |
| [stripe-setup.md](docs/stripe-setup.md) | Stripe 配置详解 |
| [partner-integration/](docs/partner-integration/) | 分销商对接文档 |
| [distributor-integration.md](docs/distributor-integration.md) | 分销商集成说明 |

---

## License

UNLICENSED - 私有项目
