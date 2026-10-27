// TODO: authPlugin(): khởi tạo verifier/signing services từ config và gắn chúng vào Elysia context.
// TODO: loadSigningKey(config): nạp private key an toàn từ secret store/env mount; kiểm tra key ID (kid).
// TODO: exposePublicKeySet(): cung cấp JWKS public đã lọc; không log key material.
// TODO: failStartupOnInvalidKey(): từ chối startup nếu key/algorithm/config không hợp lệ; không fallback thuật toán.
