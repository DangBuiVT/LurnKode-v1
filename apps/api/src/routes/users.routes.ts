// TODO: userRoutes(): mount user/profile endpoints và áp dụng authentication + role guards.
// TODO: getMyProfileHandler(principal): trả hồ sơ cho phép công khai, không trả hash/credential/session.
// TODO: patchMyProfileHandler(principal, body): chỉ cập nhật profile allowlist; không cho sửa role/status.
// TODO: listUsersHandler(principal, query): Admin-only; lọc/phân trang, loại bỏ trường nhạy cảm.
// TODO: createUserHandler(principal, body): Admin-only khi không bật public registration; áp dụng role cấp phép.
// TODO: getUserByIdHandler(principal, userId): kiểm tra quyền trước khi trả user projection an toàn.
// TODO: patchUserHandler(principal, userId, body): cập nhật profile allowlist; không nhận role/status.
// TODO: changeUserRoleHandler(principal, userId, role): Admin-only, validate role enum và bảo vệ admin cuối cùng.
// TODO: changeUserStatusHandler(principal, userId, status): Admin-only; khóa user phải thu hồi refresh sessions.
