# 代理商系统接入文档

本文档面向接入本平台的代理商技术团队，说明如何完成订单推送、买家跳转、支付结果接收与签名校验。

## 1. 文档目标

代理商接入后，需要完成两段开发：

1. 代理商服务端调用我方下单接口，创建订单并获取落地页地址
2. 买家支付完成后，代理商接收我方回跳通知并校验结果

本平台的支付链路为固定双跳模式：

1. 代理商网站提交订单到我方接口
2. 我方生成订单与 `token`
3. 我方返回一个落地页地址 `landingUrl`
4. 代理商前端将买家跳转到 `landingUrl`
5. 买家先进入我方首页
6. 我方首页再自动跳转到 Stripe 支付页
7. 支付完成后，Stripe 先回到我方站点结果页
8. 我方记录订单结果后，再自动跳回代理商 `returnUrl`

## 2. 对接前需要向我方确认的信息

在开始开发前，请向我方索取以下信息：

| 项目 | 说明 |
| --- | --- |
| `API_BASE_URL` | 我方正式接口域名 |
| `affiliateCode` | 代理商唯一编号 |
| `intakeSecret` | 下单接口签名密钥 |
| `callbackSecret` | 回跳结果签名密钥，可选但强烈建议配置 |
| `returnUrl` 白名单 | 允许回跳的地址，必须提前登记 |

说明：

- `returnUrl` 不是任意地址，必须由我方后台预先加入白名单
- `callbackSecret` 未配置时，系统仍会回跳，但代理商无法校验签名真伪
- 同一个代理商可对应多个落地域名，但域名由我方后台分配，不由代理商自行选择

## 3. 接入总流程

```text
代理商服务端
  -> POST /api/intake/orders
  -> 获取 landingUrl

代理商前端
  -> 跳转到 landingUrl

我方系统
  -> 首页自动跳 Stripe
  -> Stripe 完成支付
  -> 回到我方结果页
  -> 写入订单状态
  -> 自动跳回代理商 returnUrl
```

## 4. 下单接口

### 4.1 接口地址

```text
POST {API_BASE_URL}/api/intake/orders
```

### 4.2 请求头

```http
Content-Type: application/json
```

### 4.3 请求参数

#### 顶层字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `affiliateCode` | string | 是 | 代理商编号 |
| `externalOrderId` | string | 是 | 代理商自己的订单号，必须唯一 |
| `timestamp` | number | 是 | Unix 秒级时间戳 |
| `nonce` | string | 是 | 请求随机串，建议 UUID，每次请求必须唯一 |
| `buyer` | object | 是 | 买家信息 |
| `totalAmount` | number | 是 | 支付总金额，必须大于 0 |
| `currency` | string | 是 | 3 位币种代码，例如 `USD` |
| `items` | array | 是 | 商品列表，至少 1 项 |
| `returnUrl` | string | 否 | 支付完成后的代理商回跳地址，必须在白名单中 |
| `signature` | string | 是 | 当前请求签名 |

#### buyer 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `firstName` | string | 是 | 名 |
| `lastName` | string | 是 | 姓 |
| `email` | string | 是 | 邮箱 |
| `phone` | string | 是 | 电话 |
| `country` | string | 是 | 国家 |
| `state` | string | 是 | 省 / 州 |
| `city` | string | 是 | 城市 |
| `address1` | string | 是 | 地址 1 |
| `address2` | string | 否 | 地址 2 |
| `postalCode` | string | 是 | 邮编 |

说明：

- 收货地址必须完整
- `email` 必须是合法邮箱格式
- `address2` 可以为空字符串，也可以不传

#### items 字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `productId` | string | 否 | 商品 ID |
| `name` | string | 否 | 商品名称 |
| `quantity` | number | 是 | 数量，必须为正整数 |
| `unitPrice` | number | 是 | 单价，必须大于 0 |

说明：

- `items` 至少传 1 条
- 支付金额以接口传入的 `totalAmount` 为准
- 商品数据用于订单记录，不要求和我方后台商品价格完全一致

### 4.4 请求示例

```json
{
  "affiliateCode": "AFF_001",
  "externalOrderId": "AAA-20260321-0001",
  "timestamp": 1774051200,
  "nonce": "8e995f6d-2d26-48d7-85ad-0f19f5f69b27",
  "buyer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15550000000",
    "country": "US",
    "state": "CA",
    "city": "Los Angeles",
    "address1": "123 Main St",
    "address2": "",
    "postalCode": "90001"
  },
  "totalAmount": 29.99,
  "currency": "USD",
  "items": [
    {
      "productId": "clean001",
      "name": "SmartSpray Microfiber Floor Mop",
      "quantity": 1,
      "unitPrice": 29.99
    }
  ],
  "returnUrl": "https://aaa.com/order-complete",
  "signature": "<hmac>"
}
```

## 5. 下单接口签名算法

### 5.1 签名规则

签名算法为：

```text
HMAC-SHA256(JSON.stringify(payload_without_signature), intakeSecret)
```

说明：

1. 参与签名的内容，是去掉 `signature` 后的整个 JSON 对象
2. 将该对象执行 `JSON.stringify(...)`
3. 用代理商自己的 `intakeSecret` 计算 `HMAC-SHA256`
4. 输出十六进制字符串，放入 `signature`

### 5.2 时间戳要求

`timestamp` 必须在允许时间窗口内，目前服务端接受误差为：

```text
15 分钟
```

超时请求会被拒绝。

### 5.3 防重放要求

`nonce` 必须全局唯一，至少对同一个代理商不能重复。

若同一个代理商重复发送已使用的 `nonce`：

- 如果 `externalOrderId` 一致，系统会复用旧订单并返回原结果
- 如果 `externalOrderId` 不一致，系统会直接判定为重放请求并拒绝

### 5.4 Node.js 签名示例

```js
import crypto from "node:crypto";

const payload = {
  affiliateCode: "AFF_001",
  externalOrderId: "AAA-20260321-0001",
  timestamp: 1774051200,
  nonce: "8e995f6d-2d26-48d7-85ad-0f19f5f69b27",
  buyer: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+15550000000",
    country: "US",
    state: "CA",
    city: "Los Angeles",
    address1: "123 Main St",
    address2: "",
    postalCode: "90001"
  },
  totalAmount: 29.99,
  currency: "USD",
  items: [
    {
      productId: "clean001",
      name: "SmartSpray Microfiber Floor Mop",
      quantity: 1,
      unitPrice: 29.99
    }
  ],
  returnUrl: "https://aaa.com/order-complete"
};

const signature = crypto
  .createHmac("sha256", "your-intake-secret")
  .update(JSON.stringify(payload))
  .digest("hex");

const requestBody = {
  ...payload,
  signature
};
```

### 5.5 PHP 签名示例

```php
<?php
$payload = [
    "affiliateCode" => "AFF_001",
    "externalOrderId" => "AAA-20260321-0001",
    "timestamp" => 1774051200,
    "nonce" => "8e995f6d-2d26-48d7-85ad-0f19f5f69b27",
    "buyer" => [
        "firstName" => "John",
        "lastName" => "Doe",
        "email" => "john@example.com",
        "phone" => "+15550000000",
        "country" => "US",
        "state" => "CA",
        "city" => "Los Angeles",
        "address1" => "123 Main St",
        "address2" => "",
        "postalCode" => "90001"
    ],
    "totalAmount" => 29.99,
    "currency" => "USD",
    "items" => [
        [
            "productId" => "clean001",
            "name" => "SmartSpray Microfiber Floor Mop",
            "quantity" => 1,
            "unitPrice" => 29.99
        ]
    ],
    "returnUrl" => "https://aaa.com/order-complete"
];

$signature = hash_hmac("sha256", json_encode($payload, JSON_UNESCAPED_SLASHES), "your-intake-secret");
$payload["signature"] = $signature;
```

说明：

- PHP 端建议使用 `JSON_UNESCAPED_SLASHES`
- 不要先把数组排序再签名
- 签名对象字段顺序应与实际发送内容保持一致

## 6. 下单成功返回

### 6.1 成功响应示例

```json
{
  "ok": true,
  "orderId": "ord_xxx",
  "token": "tok_xxx",
  "landingDomain": "pay-a1.example.com",
  "landingUrl": "https://pay-a1.example.com/?token=tok_xxx"
}
```

有些情况下会返回：

```json
{
  "ok": true,
  "orderId": "ord_xxx",
  "token": "tok_xxx",
  "landingDomain": "pay-a1.example.com",
  "landingUrl": "https://pay-a1.example.com/?token=tok_xxx",
  "reused": true
}
```

这表示同一个订单已存在，系统直接复用了之前的订单和跳转地址。

### 6.2 返回字段说明

| 字段 | 说明 |
| --- | --- |
| `ok` | 是否成功 |
| `orderId` | 我方订单号 |
| `token` | 当前订单唯一 token |
| `landingDomain` | 系统分配的落地域名 |
| `landingUrl` | 买家需要跳转的完整地址 |
| `reused` | 可选，表示本次复用了已有订单 |

### 6.3 代理商收到成功响应后的动作

代理商前端或服务端应立即将买家跳转到：

```text
landingUrl
```

不要自行拼接支付页地址，也不要直接跳 Stripe。

## 7. 下单失败返回

### 7.1 常见错误码

| HTTP 状态码 | message | 说明 |
| --- | --- | --- |
| `400` | `Invalid payload` | 请求参数不合法 |
| `400` | `Request expired` | 时间戳超时 |
| `400` | `No active domain configured for affiliate` | 代理商没有可用域名池 |
| `400` | `Affiliate intake secret is not configured` | 我方后台未配置该代理商签名密钥 |
| `400` | `Return URL is not allowlisted` | `returnUrl` 不在白名单 |
| `401` | `Invalid signature` | 请求签名错误 |
| `409` | `Replay request detected` | 检测到重放请求 |

### 7.2 错误响应示例

```json
{
  "ok": false,
  "message": "Invalid signature"
}
```

参数校验错误时可能额外包含：

```json
{
  "ok": false,
  "message": "Invalid payload",
  "issues": {}
}
```

## 8. 支付结果回跳

支付完成后，系统不会直接从 Stripe 回代理商网站，而是固定按以下顺序执行：

1. Stripe 回到我方落地页域名
2. 我方写入本地订单状态
3. 我方再自动跳转到代理商 `returnUrl`

### 8.1 回跳时始终包含的字段

| 字段 | 说明 |
| --- | --- |
| `affiliateCode` | 代理商编号 |
| `orderId` | 我方订单号 |
| `externalOrderId` | 代理商订单号 |
| `status` | 订单状态 |

示例：

```text
https://aaa.com/order-complete?affiliateCode=AFF_001&orderId=ord_123&externalOrderId=AAA-20260321-0001&status=paid
```

### 8.2 配置回调签名密钥后额外包含的字段

| 字段 | 说明 |
| --- | --- |
| `ts` | 回调时间戳 |
| `sig` | 回调签名 |

示例：

```text
https://aaa.com/order-complete?affiliateCode=AFF_001&orderId=ord_123&externalOrderId=AAA-20260321-0001&status=paid&ts=1774051200&sig=abcdef123456
```

## 9. 支付结果回跳签名算法

### 9.1 签名原文

回调签名原文固定为：

```text
affiliateCode.orderId.externalOrderId.status.ts
```

例如：

```text
AFF_001.ord_123.AAA-20260321-0001.paid.1774051200
```

### 9.2 签名算法

```text
HMAC-SHA256(raw_string, callbackSecret)
```

输出十六进制字符串，对应回跳中的 `sig`。

### 9.3 时效要求

回跳签名建议只接受：

```text
5 分钟内
```

超过时效应视为失效请求。

## 10. 回跳验签示例

### 10.1 Node.js

```js
import crypto from "node:crypto";

function verifyCallback(params, secret) {
  const raw = [
    params.affiliateCode,
    params.orderId,
    params.externalOrderId,
    params.status,
    params.ts
  ].join(".");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex");

  if (expected.length !== params.sig.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(params.sig, "hex")
  );
}
```

### 10.2 PHP

```php
<?php
function verifyCallback(array $params, string $secret): bool {
    $raw = implode(".", [
        $params["affiliateCode"],
        $params["orderId"],
        $params["externalOrderId"],
        $params["status"],
        $params["ts"]
    ]);

    $expected = hash_hmac("sha256", $raw, $secret);
    return hash_equals($expected, $params["sig"]);
}
```

### 10.3 Python

```python
import hashlib
import hmac

def verify_callback(params, secret: str) -> bool:
    raw = ".".join([
        params["affiliateCode"],
        params["orderId"],
        params["externalOrderId"],
        params["status"],
        params["ts"],
    ])

    expected = hmac.new(
        secret.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, params["sig"])
```

## 11. 代理商侧推荐处理方式

### 11.1 下单侧

1. 代理商系统先生成自己的 `externalOrderId`
2. 组装完整买家地址、商品和金额
3. 计算 `signature`
4. 调用我方接口
5. 成功后跳转到 `landingUrl`

### 11.2 回跳侧

1. 先读取 `status`
2. 如果存在 `sig`，必须先验签
3. 如果验签失败，拒绝更新订单状态
4. 如果存在 `ts`，同时判断是否超时
5. 对 `orderId` 或 `externalOrderId` 做幂等处理
6. 成功后再更新代理商自己的订单状态

### 11.3 建议的状态映射

| 我方状态 | 建议含义 |
| --- | --- |
| `paid` | 已支付成功 |
| `failed` | 支付失败 |
| `canceled` | 用户取消支付 |
| `expired` | 支付会话过期 |

## 12. 幂等与重试建议

代理商系统建议按以下原则实现：

- 同一个 `externalOrderId` 不要重复创建新业务单
- 同一个 `nonce` 不要重复使用
- 同一个回跳通知不要重复入账
- 以 `orderId` 或 `externalOrderId` 做最终幂等键

如果代理商重复调用下单接口，但参数本质相同，系统可能返回已存在订单的复用结果，这属于正常行为。

## 13. 联调建议

正式联调前，建议按下面顺序测试：

1. 使用测试环境密钥调用下单接口
2. 验证能正确拿到 `landingUrl`
3. 验证跳转后会先进入我方首页，再进入 Stripe
4. 测试支付成功场景
5. 测试支付失败场景
6. 测试用户取消场景
7. 验证回跳地址是否正确
8. 验证 `sig` 和 `ts` 校验逻辑
9. 验证代理商自身订单更新是否幂等

## 14. 常见问题

### 14.1 为什么不能直接跳 Stripe？

因为本平台业务要求必须先进入我方首页，再由首页自动跳到支付页。这是固定流程，不支持代理商直接拼 Stripe 地址。

### 14.2 为什么支付成功后不直接从 Stripe 回代理商？

因为系统需要先在我方站点记录订单结果、写日志并完成状态同步，然后才回跳到代理商。

### 14.3 `returnUrl` 为什么要提前登记？

为了避免任意回跳地址带来的安全风险，所以只允许已登记的地址。

### 14.4 没有配置 `callbackSecret` 能否接入？

可以。系统仍会回跳，但回跳参数无法做到强校验。正式生产环境建议一定配置 `callbackSecret`。

### 14.5 商品价格为什么以接口传入金额为准？

因为本平台支持代理商侧自定义订单金额，支付价格以下单接口中的 `totalAmount` 为准。

## 15. 我方建议的最小开发清单

代理商至少完成以下功能：

1. 服务端下单接口调用
2. HMAC 下单签名
3. 买家跳转到 `landingUrl`
4. 回跳地址页面接收参数
5. 回跳签名校验
6. 回跳幂等处理
7. 成功、失败、取消三种状态处理

## 16. 相关文档

- [分销英文技术文档](/D:/Code_Space/shopA/docs/distributor-integration.md)
- [Stripe 配置文档](/D:/Code_Space/shopA/docs/stripe-setup.md)
- [部署文档](/D:/Code_Space/shopA/docs/deployment.md)
- [宝塔部署文档](/D:/Code_Space/shopA/docs/deployment-bt-panel.md)
- [商务版接入说明](/D:/Code_Space/shopA/docs/partner-integration/商务版接入说明.md)
- [Java CSharp 示例](/D:/Code_Space/shopA/docs/partner-integration/Java-CSharp-示例.md)
- [Postman 测试说明](/D:/Code_Space/shopA/docs/partner-integration/POSTMAN-测试说明.md)
- [示例请求 JSON](/D:/Code_Space/shopA/docs/partner-integration/examples/intake-request.sample.json)
