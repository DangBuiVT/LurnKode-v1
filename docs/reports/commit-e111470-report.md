# Báo cáo commit `e111470`

**Nhánh:** `feature/m5-ui`  
**Commit:** `e1114707be28ea822c8535186449ee666ace5345` — `add more communication via API to the files, remove hard code`  
**So sánh với:** `b20e759fd1492f62f774e3afa21955ad9b5b3cf0`  
**Quy mô:** 35 file, 2.081 dòng thêm và 372 dòng xóa.

## Tóm tắt

Commit này nối thêm giao diện LurnKode với API cho luồng khóa học, học bài và tài khoản; đồng thời thêm trang đăng nhập/đăng ký, dữ liệu seed khóa học tiếng Việt và script khôi phục nội dung. Nhiều màn hình cũng được chuyển từ dữ liệu mẫu sang dữ liệu backend, nhưng một số hành vi vẫn còn dùng `mockDb` làm fallback hoặc chưa ghi thay đổi lên API.

## Các thay đổi chính

### 1. Tài khoản và phân quyền giao diện

- Thêm `AuthProvider`/`useAuth`, trang `/login`, `/register`, các alias `/auth/login`, `/auth/register` và menu tài khoản.
- Header, sidebar và Creator Studio điều hướng theo trạng thái đăng nhập/vai trò Learner, Instructor, Admin.
- API client hỗ trợ URL nội bộ `INTERNAL_API_URL` khi chạy server trong Docker; cấu hình Compose trỏ URL này tới service `api`.
- Token được lưu trong localStorage và một cookie phía trình duyệt để hỗ trợ các request cần cookie.

### 2. Khóa học và dữ liệu giảng viên

- API liệt kê khóa học nay join bảng users để trả tên/email giảng viên; API chi tiết khóa học cũng bổ sung thông tin giảng viên.
- Adapter frontend suy luận danh mục từ tên/mô tả khóa học và dùng tên giảng viên backend thay cho giá trị cố định.
- Catalog và trang Creator Studio tải danh sách khóa học từ API, có trạng thái tải; trang chi tiết xử lý đăng ký và tải chương/bài học theo enrollment.

### 3. Luồng học và quản lý khóa học

- `/learn` tìm enrollment hiện tại, tiếp tục bài đã học hoặc mở bài đầu tiên; bổ sung trạng thái chưa đăng ký khóa học.
- Trang bài học tải nội dung học liệu từ API/backend course detail và bỏ một số nội dung bài học mẫu cố định.
- Các trang quiz, thẻ khóa học và điều hướng studio được cập nhật để phù hợp với luồng dữ liệu/role mới.
- Một số mục giao diện bị ẩn tạm thời: liên kết Progress ở sidebar và nút xem sổ điểm trong màn hình quản lý quiz.

### 4. Dữ liệu mẫu và cấu hình

- Thêm `scripts/seed-vietnamese.ts` để tạo/cập nhật tài khoản giảng viên, bốn khóa học tiếng Việt, chương, bài học và học liệu.
- Thêm `scripts/rollback-vietnamese.ts` để đổi tên/cấu trúc khóa học về nội dung tiếng Việt.

## Điểm cần lưu ý khi đọc diff

- `AuthProvider` khởi tạo `isLoading` là `false` và không bật trạng thái tải trong lúc gọi `/me`. Vì vậy, các trang kiểm tra đăng nhập như Creator Studio có thể điều hướng khách ra ngoài trước khi khôi phục phiên từ token hoàn tất.
- Trong chi tiết khóa học, nhánh lỗi API đăng ký vẫn ghi vào `mockDb` và báo đăng ký thành công; thao tác rời khóa học cũng chỉ cập nhật `mockDb`. Trạng thái trên UI do đó có thể không khớp backend.
- Seed script chứa mật khẩu mặc định dùng chung cho các tài khoản demo/giảng viên và URL database mặc định có thông tin đăng nhập. Cần xác nhận đây chỉ là dữ liệu môi trường phát triển trước khi dùng với database thật.
- `learning-view` vẫn dùng `mockDb` để ghi nhận bài vừa truy cập/hoàn thành; nên kiểm tra xem hai trạng thái này đã được đồng bộ qua API ở nơi khác chưa.
- Không tìm thấy đặc tả/issue gắn với commit trong thông tin đã kiểm tra, nên báo cáo mô tả diff thay vì kết luận mức độ đáp ứng yêu cầu sản phẩm.

## Kiểm tra

Đã xem metadata, danh sách file và diff của commit với commit cha. Không chạy test/build trong lần lập báo cáo này.
