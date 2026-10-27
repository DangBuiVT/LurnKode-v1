// TODO: authRoutes(): khai báo endpoint auth và gắn request/response schema.
// TODO: registerHandler(body): nếu đăng ký public được duyệt, tạo Learner; tuyệt đối bỏ qua role client gửi.
// TODO: loginHandler(body, context): gọi auth service và trả access token + refresh transport đã thống nhất.
// TODO: logoutHandler(principal, sessionCookieOrToken): thu hồi refresh session hiện tại; không tuyên bố JWT đã revoke tức thì.
// TODO: getCurrentIdentityHandler(principal): trả identity tối thiểu từ token đã xác minh (userId, role, claims cần thiết).
// TODO: refreshHandler(refreshCredential): rotation refresh token; phát hiện reuse thì thu hồi token family.
// TODO: changePasswordHandler(principal, body): xác minh mật khẩu hiện tại, cập nhật hash và thu hồi refresh sessions.

