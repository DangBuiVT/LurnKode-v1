// TODO: refresh_sessions schema: UUID ID, userId FK, familyId, tokenHash unique, expiresAt, consumedAt, revokedAt, createdAt.
// TODO: lưu metadata tối thiểu (ví dụ device label); không lưu raw refresh token hoặc dữ liệu nhạy cảm không cần thiết.
// TODO: indexes cho lookup theo tokenHash/userId/familyId và cleanup hết hạn.
// TODO: constraints đảm bảo mỗi refresh token chỉ consume một lần; thao tác rotate phải atomic.
