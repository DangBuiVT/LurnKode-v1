// TODO: getProfile(userId): trả user projection an toàn cho /users/me.
// TODO: updateOwnProfile(userId, patch): chỉ áp dụng allowlist và kiểm tra unique email khi đổi.
// TODO: listUsers(filters, pagination): Admin-only orchestration, không trả sensitive columns.
// TODO: createManagedUser(adminId, input): tạo user theo policy, kiểm tra role cấp được.
// TODO: updateUserProfile(adminId, userId, patch): không cho thay role/status qua profile endpoint.
// TODO: changeUserRole(adminId, userId, role): kiểm tra role, audit actor và bảo vệ admin cuối cùng.
// TODO: changeUserStatus(adminId, userId, status): khóa/mở user và thu hồi refresh sessions nếu khóa.
