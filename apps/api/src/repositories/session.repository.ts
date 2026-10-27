// TODO: insertRefreshSession(session): lưu token hash, family ID, expiry, createdAt và metadata tối thiểu.
// TODO: findByTokenHash(hash): lấy session state để thực hiện rotation/reuse detection.
// TODO: consumeAndRotate(sessionId, replacement): atomic one-time consume; ngăn refresh race/replay.
// TODO: revokeSession(sessionId, reason): revoke đúng session hiện tại.
// TODO: revokeFamily(familyId, reason): revoke mọi session trong family trong một transaction.
// TODO: revokeAllForUser(userId, reason): revoke session đang hoạt động khi password/status đổi.
// TODO: cleanupExpiredSessions(now): xóa/ẩn session hết hạn theo retention policy.
