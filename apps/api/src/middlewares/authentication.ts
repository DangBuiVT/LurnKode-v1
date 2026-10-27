// TODO: authenticateRequest(headers): lấy Bearer JWT, verify RS256 + kid + iss + aud + exp + nbf nếu có.
// TODO: buildPrincipal(claims): tạo principal bất biến từ sub UUID và role enum đã xác thực.
// TODO: rejectInvalidCredential(reason): trả 401 ổn định, không làm lộ chi tiết chữ ký/key/token.
// TODO: neverTrustCallerIdentity(): bỏ qua userId/role do body/query/header tùy ý cung cấp.
