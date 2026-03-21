# 代理商接入检查清单

本文档用于代理商联调前自查。

## 1. 基础信息

- 已拿到 `API_BASE_URL`
- 已拿到 `affiliateCode`
- 已拿到 `intakeSecret`
- 已确认 `returnUrl`
- 已确认 `returnUrl` 被我方加入白名单
- 已确认 webhook 地址
- 已拿到 `callbackSecret`，如果尚未配置也已知晓风险

## 2. 下单接口

- 已按 JSON 方式提交 `POST /api/intake/orders`
- 已传完整 `buyer` 收货地址
- 已传 `items`
- 已传 `totalAmount`
- 已确认最终支付金额以 `totalAmount` 为准
- 已传 `currency`
- 已生成唯一 `externalOrderId`
- 已生成唯一 `nonce`
- 已生成正确 `signature`

## 3. 跳转逻辑

- 下单成功后会跳转到 `landingUrl`
- 不会绕过首页直接跳 Stripe
- 支付成功、失败、取消都能返回代理商页面
- 支付成功、失败、取消都能触发异步 webhook

## 4. 回跳处理

- 已接收 `affiliateCode`
- 已接收 `orderId`
- 已接收 `externalOrderId`
- 已接收 `status`
- 已理解浏览器会自动跳回 `returnUrl`
- 如果启用签名，已校验 `sig`
- 如果启用签名，已校验 `ts`
- 已对回跳做幂等处理

## 5. 异步 webhook

- 已提供独立 webhook 地址
- 已接收 `POST JSON`
- 已校验 `X-Shopa-Signature` 或 `sig`
- 已校验 `X-Shopa-Timestamp` 或 `ts`
- 已对 webhook 做幂等处理
- 已能返回 `HTTP 200`

## 6. 场景测试

- 成功支付已测试
- 失败支付已测试
- 用户取消已测试
- 异步 webhook 已测试
- 重复请求已测试
- 非法签名已测试
- 白名单外回跳地址已测试
