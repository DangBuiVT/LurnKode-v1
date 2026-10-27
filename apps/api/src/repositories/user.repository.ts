// TODO: findByLoginIdentifier(identifier): lấy user + credential fields chỉ dùng nội bộ Auth.
// TODO: findPublicById(userId): lấy projection không chứa password hash hoặc credential/session data.
// TODO: list(filters, pagination): query admin listing với pagination và safe projection.
// TODO: insert(userRecord, transaction?): tạo user và credentials trong transaction.
// TODO: updateProfile(userId, patch, transaction?): chỉ cập nhật fields đã allowlist.
// TODO: updateRole(userId, role, actorId, transaction?): cập nhật role với audit context.
// TODO: updateStatus(userId, status, transaction?): thay đổi trạng thái account.
// TODO: countActiveAdmins(transaction?): hỗ trợ ngăn vô hiệu hóa/xóa Admin cuối cùng.
