# 宝塔面板部署文档

本文档面向 `bt.cn` 宝塔面板部署本项目，目标是把当前 SaaS 商城稳定跑起来，并支持：

- 多域名落地页
- 每个域名单独绑定 Stripe 账号
- 分销商 API 下单后自动落地页跳转
- 商城自购模式
- PostgreSQL 生产环境
- HTTPS 与 Stripe Webhook

## 1. 推荐部署结构

生产环境建议如下：

- 宝塔面板
- `Nginx`
- `Node.js` 运行环境
- `PM2` 或宝塔 Node 项目管理器
- `PostgreSQL`
- 一个应用目录，例如 `/www/wwwroot/shopa`

请求链路：

1. 所有商城域名和支付落地域名都解析到同一台服务器
2. `Nginx` 按原始 `Host` 转发给 Next.js
3. Next.js 根据域名识别当前站点模板、Stripe 配置和订单上下文
4. Stripe 支付完成后回到原落地域名
5. 系统先在本站写入订单结果，再自动跳回分销商 `returnUrl`

## 2. 宝塔环境准备

宝塔面板中至少安装：

- `Nginx`
- `PM2管理器` 或 `Node项目管理器`
- `PostgreSQL`
- `Git`

建议：

- Node.js 使用较新的 LTS 版本，建议 `22`
- PostgreSQL 使用 `15+`
- 站点全部开启 `SSL`

## 3. 拉取代码

先在宝塔终端进入站点目录：

```bash
cd /www/wwwroot
git clone <你的私有仓库地址> shopa
cd shopa
```

如果服务器不能直接访问 GitHub，也可以本地打包后上传到：

```text
/www/wwwroot/shopa
```

## 4. 生产环境变量

在项目根目录创建 `.env`：

```env
APP_ENV=production
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://shopa_user:strong_password@127.0.0.1:5432/shopa
AUTH_SECRET=replace-with-long-random-string
NEXTAUTH_URL=https://admin.your-domain.com
APP_INTERNAL_BASE_URL=https://admin.your-domain.com
INTAKE_TOKEN_SECRET=replace-with-long-random-string
INTAKE_SIGNATURE_SECRET=
STRIPE_SECRET_ENCRYPTION_KEY=replace-with-32-bytes-or-longer-secret
```

说明：

- `DATABASE_PROVIDER` 线上必须改成 `postgresql`
- `NEXTAUTH_URL` 建议填你的后台主域名
- `APP_INTERNAL_BASE_URL` 建议与实际对外访问主域名一致
- `STRIPE_SECRET_ENCRYPTION_KEY` 用于加密数据库里的 Stripe 密钥，必须妥善保存
- `INTAKE_SIGNATURE_SECRET` 仅作为旧式本地兼容字段，正式环境以后台为每个分销商单独配置的密钥为准

## 5. PostgreSQL 初始化

先在宝塔安装并启动 PostgreSQL，然后创建数据库和用户。

示例 SQL：

```sql
CREATE DATABASE shopa;
CREATE USER shopa_user WITH ENCRYPTED PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE shopa TO shopa_user;
```

如果你把 PostgreSQL 放在本机，`DATABASE_URL` 可以写成：

```env
DATABASE_URL=postgresql://shopa_user:strong_password@127.0.0.1:5432/shopa
```

## 6. 安装依赖与初始化数据库

在项目目录执行：

```bash
npm install
npm run db:use:postgres
npm run db:push
npm run seed:products
```

首次上线还需要创建管理员账号：

```bash
export ADMIN_EMAIL=admin@example.com
export ADMIN_PASSWORD='ReplaceWithAStrongPassword'
export ADMIN_NAME='Main Admin'
npm run admin:create
```

如果你的宝塔终端是 `sh` 或 `bash`，用上面的 `export`。如果是 PowerShell，再改为 `$env:` 形式。

## 7. 构建与启动

先构建：

```bash
npm run build
```

然后用以下任一方式启动。

### 方案 A：宝塔 Node 项目管理器

宝塔面板中创建 Node 项目：

- 项目目录：`/www/wwwroot/shopa`
- 启动命令：`npm run start`
- 运行端口：`3000`
- Node 版本：选择你安装的生产版本

### 方案 B：PM2

服务器终端执行：

```bash
pm2 start npm --name shopa -- run start
pm2 save
pm2 startup
```

如果你修改了环境变量或重新发布代码，执行：

```bash
pm2 restart shopa
```

## 8. Nginx 反向代理

宝塔里每个域名都建站并开启反向代理，统一转发到：

```text
http://127.0.0.1:3000
```

反向代理时必须保留这些头：

- `Host`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

因为本项目依赖真实域名来决定：

- 当前落地页模板
- 当前域名对应的 Stripe 账号
- Stripe 回跳地址
- 分销订单归属

如果你使用自定义 Nginx 配置，可参考：

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## 9. 域名与模板配置

本项目支持多个商城域名和支付落地域名共用同一套程序。

上线后在管理员后台配置：

1. 创建分销商
2. 给分销商分配域名池
3. 给每个域名设置模板 `A / B / C`
4. 如果未设置模板，系统默认使用模板 `A`
5. 给每个域名单独配置对应的 Stripe 密钥

注意：

- 域名池由管理员分配，不是分销商自己选
- 分销 API 下单时会从可用域名池中随机分配一个域名
- 一个域名只能绑定一套 Stripe 凭证

## 10. 商城自购模式

即使没有分销商，商城前台也可以直接购买：

1. 用户访问商城域名
2. 在前台直接填写收货地址
3. 系统生成订单
4. 跳转 Stripe Checkout

如果某个域名没有配置 Stripe：

- 商品页仍然可以浏览
- 可填写购买信息
- 到结账时会提示无法完成支付

所以线上正式启用前，至少要为可售卖域名补齐 Stripe 配置。

## 11. Stripe 配置

每个落地域名需要单独配置一套：

- Stripe Secret Key
- Stripe Publishable Key
- Webhook Secret
- Stripe 账号标识

这些配置通过管理员后台录入，数据库中加密保存。

详细字段和回跳原则可继续参考：

- [deployment.md](/D:/Code_Space/shopA/docs/deployment.md)
- [stripe-setup.md](/D:/Code_Space/shopA/docs/stripe-setup.md)
- [distributor-integration.md](/D:/Code_Space/shopA/docs/distributor-integration.md)

## 12. Stripe Webhook 配置

推荐每个 Stripe 账号分别配置自己的 Webhook 地址：

```text
https://你的域名/api/stripe/webhooks/{stripeAccountId}
```

说明：

- `{stripeAccountId}` 是系统内保存的 Stripe 配置 ID
- 不同域名绑定不同 Stripe 账号时，要分别在对应 Stripe 后台创建 Webhook
- 这是订单最终状态同步的关键链路，必须配置

至少订阅这些事件：

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

## 13. 分销商对接说明

分销站服务端调用：

```text
POST /api/intake/orders
```

系统会：

1. 校验签名、时间戳、随机数、回跳地址
2. 自动生成订单和 token
3. 从分销商域名池中随机分配一个落地域名
4. 返回 `landingUrl`

分销商再把买家跳到：

```text
https://landing-domain.example.com/?token=xxx
```

之后系统会自动执行：

1. 打开首页
2. 记录访问
3. 自动跳到支付页
4. 支付完成后回到本站结果页
5. 再自动跳回分销商 `returnUrl`

如果配置了回调签名密钥，回跳会带上 `sig` 和 `ts`，用于防伪造。

## 14. SSL 与域名解析

所有用于商城展示、支付跳转、支付结果回跳的域名都必须：

- 正确解析到当前服务器
- 在宝塔中建站
- 申请并启用 SSL

原因：

- Stripe 正式环境通常要求 HTTPS
- 本项目按真实域名区分站点和 Stripe 账号
- 不同域名需要回到各自原始落地页

## 15. 上线后后台初始化顺序

建议按下面顺序操作：

1. 创建超级管理员
2. 登录管理员后台
3. 导入或确认商品
4. 创建分销商
5. 录入分销商 Intake Secret
6. 录入分销商 Callback Secret
7. 配置允许的 `returnUrl`
8. 添加域名池
9. 为每个域名设置模板
10. 为每个域名设置 Stripe 密钥
11. 创建分销商后台账号

## 16. 发布更新流程

后续版本更新建议固定流程：

```bash
cd /www/wwwroot/shopa
git pull
npm install
npm run db:use:postgres
npm run db:push
npm run seed:products
npm run build
pm2 restart shopa
```

如果你用的是宝塔 Node 项目管理器，就在面板里重启项目。

## 17. 上线检查清单

至少检查以下项目：

- 前台商品页在三个模板下显示正常
- 直接购买可填写完整地址
- 表单布局在手机和桌面端正常
- 分销 API 能成功创建订单
- 随机域名分配正常
- 落地页会自动再跳 Stripe
- 支付成功后会先写本站订单状态
- 成功、失败、取消都会自动回到分销商 `returnUrl`
- 回调签名可被分销商正确校验
- 管理员后台日志可看到完整链路
- 分销商后台只能看到自己的订单
- 未配置 Stripe 的域名不会误成功扣款

## 18. 常见问题

### 1. 为什么支付成功后不能直接从 Stripe 回分销站？

因为你的业务要求必须先回本站落地页，再由本站记录订单状态后自动跳回分销商，这样链路更稳定，也方便风控和审计。

### 2. 为什么必须保留真实 Host？

因为系统是按域名识别模板、Stripe 账号和回跳地址的。如果代理层把 `Host` 改掉，整个多域名逻辑会失效。

### 3. 没有 Stripe 配置时能否浏览商城？

可以。前台仍可展示商品并填写订单信息，但无法完成支付。

### 4. 是否一定要 Webhook？

是。结果页回跳只能代表用户浏览器回来了，不能代表支付状态一定可靠。订单最终状态应以 Stripe Webhook 为准。
