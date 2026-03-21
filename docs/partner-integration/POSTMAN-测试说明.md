# Postman 测试说明

本文档面向代理商开发人员，说明如何使用 Postman 测试下单接口。

## 1. 测试目标

通过 Postman 验证以下内容：

- 下单接口是否可调用
- 参数结构是否正确
- 签名是否正确
- 是否能返回 `landingUrl`
- 是否能正常进入支付链路

## 2. 接口地址

```text
POST {API_BASE_URL}/api/intake/orders
```

## 3. 建议在 Postman 中设置的环境变量

| 变量名 | 说明 |
| --- | --- |
| `api_base_url` | 我方接口基础地址 |
| `affiliate_code` | 代理商编号 |
| `intake_secret` | 下单签名密钥 |
| `return_url` | 回跳地址 |
| `external_order_id` | 代理商订单号 |
| `nonce` | 随机串 |
| `timestamp` | Unix 秒级时间戳 |

## 4. Body 示例

Postman 选择：

- `Body`
- `raw`
- `JSON`

请求体示例：

```json
{
  "affiliateCode": "{{affiliate_code}}",
  "externalOrderId": "{{external_order_id}}",
  "timestamp": {{timestamp}},
  "nonce": "{{nonce}}",
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
  "returnUrl": "{{return_url}}",
  "signature": "{{signature}}"
}
```

## 5. Pre-request Script 示例

在 Postman 的 `Pre-request Script` 中可使用下面脚本自动生成：

- `timestamp`
- `nonce`
- `external_order_id`
- `signature`

```javascript
const affiliateCode = pm.environment.get("affiliate_code");
const intakeSecret = pm.environment.get("intake_secret");
const returnUrl = pm.environment.get("return_url");

const timestamp = Math.floor(Date.now() / 1000);
const nonce = crypto.randomUUID();
const externalOrderId = `POSTMAN-${timestamp}`;

pm.environment.set("timestamp", String(timestamp));
pm.environment.set("nonce", nonce);
pm.environment.set("external_order_id", externalOrderId);

const payload = {
  affiliateCode,
  externalOrderId,
  timestamp,
  nonce,
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
  returnUrl
};

const json = JSON.stringify(payload);
const signature = CryptoJS.HmacSHA256(json, intakeSecret).toString(CryptoJS.enc.Hex);
pm.environment.set("signature", signature);
```

说明：

- `signature` 的参与签名内容，不包含 `signature` 字段本身
- 字段结构必须与最终发送内容完全一致

## 6. Headers 设置

```http
Content-Type: application/json
```

## 7. 成功响应示例

```json
{
  "ok": true,
  "orderId": "ord_xxx",
  "token": "tok_xxx",
  "landingDomain": "pay-a1.example.com",
  "landingUrl": "https://pay-a1.example.com/?token=tok_xxx"
}
```

## 8. 成功后如何验证

拿到 `landingUrl` 后：

1. 复制到浏览器打开
2. 验证先进入我方首页
3. 再自动跳转到 Stripe 支付页
4. 完成支付后验证是否回到你登记的 `returnUrl`

## 9. 常见报错排查

### 9.1 `Invalid signature`

请检查：

- 是否把 `signature` 字段也参与了签名
- JSON 结构和顺序是否变化
- 是否使用了错误的 `intakeSecret`

### 9.2 `Request expired`

请检查：

- `timestamp` 是否实时生成
- 服务器时间是否准确

### 9.3 `Return URL is not allowlisted`

请检查：

- `returnUrl` 是否已经由我方加入白名单
- 测试环境和正式环境地址是否混用

### 9.4 `Replay request detected`

请检查：

- 是否重复使用了同一个 `nonce`
- 是否重复提交了相同请求

## 10. 推荐测试顺序

1. 先跑通一次成功下单
2. 再验证回跳地址是否正确
3. 再测试签名错误场景
4. 再测试白名单错误场景
5. 最后联调支付成功、失败、取消三种结果
