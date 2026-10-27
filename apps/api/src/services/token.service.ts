// TODO: issueAccessToken(user): ký JWT RS256; claims sub, role, iss, aud, iat, exp, jti; TTL đề xuất 15 phút.
// TODO: verifyAccessToken(token, expectedAudience): chỉ chấp nhận RS256 và kiểm tra iss/aud/exp/signature.
// TODO: rotateSigningKey(newKey, overlap): hỗ trợ kid/JWKS overlap theo runbook; không log private key.
// TODO: getPublicJwks(): trả public JWK set cho JWKS route, tuyệt đối không đưa private parameters.
// TODO: createOpaqueRefreshToken(): sinh token ngẫu nhiên đủ mạnh; chỉ trả raw secret đúng lúc phát hành.
// TODO: hashRefreshToken(rawToken): hash one-way để lưu và so khớp an toàn.
