# Java / C# 对接示例

本文档面向代理商开发人员，提供 Java 与 C# 的下单签名和支付回跳验签示例。

## 1. Java 下单签名示例

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

public class IntakeSigner {
    public static String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        String payloadJson = "{"
            + "\"affiliateCode\":\"AFF_001\","
            + "\"externalOrderId\":\"AAA-20260321-0001\","
            + "\"timestamp\":1774051200,"
            + "\"nonce\":\"8e995f6d-2d26-48d7-85ad-0f19f5f69b27\","
            + "\"buyer\":{"
            + "\"firstName\":\"John\","
            + "\"lastName\":\"Doe\","
            + "\"email\":\"john@example.com\","
            + "\"phone\":\"+15550000000\","
            + "\"country\":\"US\","
            + "\"state\":\"CA\","
            + "\"city\":\"Los Angeles\","
            + "\"address1\":\"123 Main St\","
            + "\"address2\":\"\","
            + "\"postalCode\":\"90001\""
            + "},"
            + "\"totalAmount\":29.99,"
            + "\"currency\":\"USD\","
            + "\"items\":[{"
            + "\"productId\":\"clean001\","
            + "\"name\":\"SmartSpray Microfiber Floor Mop\","
            + "\"quantity\":1,"
            + "\"unitPrice\":29.99"
            + "}],"
            + "\"returnUrl\":\"https://aaa.com/order-complete\""
            + "}";

        String signature = hmacSha256(payloadJson, "your-intake-secret");
        System.out.println(signature);
    }
}
```

说明：

- Java 侧必须保证参与签名的 JSON 字符串，和实际发送的请求体内容一致
- 不要改字段顺序后再签名
- 不要把 `signature` 字段本身算进签名

## 2. Java 回跳验签示例

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

public class CallbackVerifier {
    public static String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public static boolean verify(
        String affiliateCode,
        String orderId,
        String externalOrderId,
        String status,
        String ts,
        String sig,
        String secret
    ) throws Exception {
        String raw = String.join(".", affiliateCode, orderId, externalOrderId, status, ts);
        String expected = hmacSha256(raw, secret);
        return expected.equalsIgnoreCase(sig);
    }
}
```

## 3. C# 下单签名示例

```csharp
using System;
using System.Security.Cryptography;
using System.Text;

public static class IntakeSigner
{
    public static string HmacSha256(string data, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder();
        foreach (var b in hash)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    public static void Main()
    {
        var payloadJson = "{"
            + "\"affiliateCode\":\"AFF_001\","
            + "\"externalOrderId\":\"AAA-20260321-0001\","
            + "\"timestamp\":1774051200,"
            + "\"nonce\":\"8e995f6d-2d26-48d7-85ad-0f19f5f69b27\","
            + "\"buyer\":{"
            + "\"firstName\":\"John\","
            + "\"lastName\":\"Doe\","
            + "\"email\":\"john@example.com\","
            + "\"phone\":\"+15550000000\","
            + "\"country\":\"US\","
            + "\"state\":\"CA\","
            + "\"city\":\"Los Angeles\","
            + "\"address1\":\"123 Main St\","
            + "\"address2\":\"\","
            + "\"postalCode\":\"90001\""
            + "},"
            + "\"totalAmount\":29.99,"
            + "\"currency\":\"USD\","
            + "\"items\":[{"
            + "\"productId\":\"clean001\","
            + "\"name\":\"SmartSpray Microfiber Floor Mop\","
            + "\"quantity\":1,"
            + "\"unitPrice\":29.99"
            + "}],"
            + "\"returnUrl\":\"https://aaa.com/order-complete\""
            + "}";

        var signature = HmacSha256(payloadJson, "your-intake-secret");
        Console.WriteLine(signature);
    }
}
```

## 4. C# 回跳验签示例

```csharp
using System;
using System.Security.Cryptography;
using System.Text;

public static class CallbackVerifier
{
    public static string HmacSha256(string data, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder();
        foreach (var b in hash)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    public static bool Verify(
        string affiliateCode,
        string orderId,
        string externalOrderId,
        string status,
        string ts,
        string sig,
        string secret)
    {
        var raw = string.Join(".", affiliateCode, orderId, externalOrderId, status, ts);
        var expected = HmacSha256(raw, secret);
        return string.Equals(expected, sig, StringComparison.OrdinalIgnoreCase);
    }
}
```

## 5. 开发注意事项

- 下单签名时，不要把 `signature` 字段包含进去
- 回跳验签时，拼接顺序必须是：

```text
affiliateCode.orderId.externalOrderId.status.ts
```

- `ts` 建议只接受 5 分钟内的请求
- 代理商系统应按 `orderId` 或 `externalOrderId` 做幂等处理
- 正式环境务必使用我方提供的正式密钥，不要混用测试密钥
