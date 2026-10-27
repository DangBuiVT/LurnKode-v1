// TODO: createSession(userId, deviceMetadata): lưu hash refresh token, expiry đề xuất 7 ngày và family ID.
// TODO: rotateSession(rawRefreshToken): consume token cũ atomically, tạo token mới và access token.
// TODO: revokeSession(rawRefreshToken): thu hồi refresh session hiện tại khi logout.
// TODO: revokeSessionFamily(familyId, reason): thu hồi toàn family khi phát hiện reuse.
// TODO: revokeAllUserSessions(userId, reason): dùng khi đổi password/khóa account/role policy yêu cầu.
// TODO: detectRefreshTokenReuse(tokenRecord): nhận diện token đã rotate/revoked và trigger family revocation.
