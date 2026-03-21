# PHP 对接示例

本文档提供 PHP 版完整接入示例，包含：

- 下单签名
- 发送下单请求
- 接收支付结果回跳
- 校验回跳签名

## 1. 生成下单签名

```php
<?php
function createIntakeSignature(array $payload, string $secret): string {
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
    return hash_hmac("sha256", $json, $secret);
}

$payload = [
    "affiliateCode" => "AFF_001",
    "externalOrderId" => "AAA-20260321-0001",
    "timestamp" => time(),
    "nonce" => bin2hex(random_bytes(16)),
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
    "totalAmount" => 49.90,
    "currency" => "USD",
    "items" => [
        [
            "productId" => "partner_bundle_001",
            "name" => "Partner bundle",
            "quantity" => 1,
            "unitPrice" => 19.90
        ],
        [
            "productId" => "partner_service_001",
            "name" => "Partner service fee",
            "quantity" => 1,
            "unitPrice" => 5.00
        ]
    ],
    "returnUrl" => "https://aaa.com/order-complete"
];

$payload["signature"] = createIntakeSignature($payload, "your-intake-secret");
```

说明：

- 支付金额最终以 `totalAmount` 为准
- `items` 仅用于订单记录和展示，不要求与我方商城商品库一致
- 不要把 `signature` 字段本身算进签名

## 2. 发送下单请求

```php
<?php
$apiBaseUrl = "https://your-api.example.com";
$ch = curl_init($apiBaseUrl . "/api/intake/orders");

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES),
]);

$responseBody = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$response = json_decode($responseBody, true);

if ($httpCode !== 200 || empty($response["ok"])) {
    die("Create order failed: " . ($response["message"] ?? "unknown error"));
}

$landingUrl = $response["landingUrl"];
echo "Redirect buyer to: " . $landingUrl . PHP_EOL;
```

## 3. 跳转买家

如果你的 PHP 页面需要直接跳转买家：

```php
<?php
header("Location: " . $landingUrl, true, 302);
exit;
```

## 4. 接收支付结果回跳

我方系统完成支付链路后，会把买家浏览器自动跳回你登记的 `returnUrl`，并附带：

- `affiliateCode`
- `orderId`
- `externalOrderId`
- `status`

若已配置 `callbackSecret`，还会附带：

- `ts`
- `sig`

示例：

```text
https://aaa.com/order-complete?affiliateCode=AFF_001&orderId=ord_123&externalOrderId=AAA-20260321-0001&status=paid&ts=1774051200&sig=abcdef...
```

## 5. 校验回跳签名

```php
<?php
function verifyCallback(array $params, string $secret): bool {
    if (
        empty($params["affiliateCode"]) ||
        empty($params["orderId"]) ||
        empty($params["externalOrderId"]) ||
        empty($params["status"]) ||
        empty($params["ts"]) ||
        empty($params["sig"])
    ) {
        return false;
    }

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

function isFreshTimestamp(string $ts, int $maxAgeSeconds = 300): bool {
    if (!ctype_digit($ts)) {
        return false;
    }

    return abs(time() - intval($ts)) <= $maxAgeSeconds;
}
```

## 6. 回跳处理示例

```php
<?php
$params = $_GET;
$callbackSecret = "your-callback-secret";

$status = $params["status"] ?? "";
$orderId = $params["orderId"] ?? "";
$externalOrderId = $params["externalOrderId"] ?? "";

if (!empty($params["sig"])) {
    if (!verifyCallback($params, $callbackSecret)) {
        http_response_code(400);
        exit("invalid callback signature");
    }

    if (!isFreshTimestamp($params["ts"])) {
        http_response_code(400);
        exit("expired callback timestamp");
    }
}

// 这里按你的业务做幂等更新
// 推荐用 orderId 或 externalOrderId 做唯一更新

switch ($status) {
    case "paid":
        // 标记已支付
        break;
    case "failed":
        // 标记支付失败
        break;
    case "canceled":
        // 标记用户取消
        break;
    case "expired":
        // 标记会话过期
        break;
}

echo "ok";
```

## 7. 重要说明

- 当前正式回调链路是“浏览器自动跳回 `returnUrl`”
- 当前系统默认不提供独立的代理商服务端 webhook 推送
- 管理员后台支持在终态订单上手动补发一次 GET 回跳
- 正式环境建议务必启用 `callbackSecret`
