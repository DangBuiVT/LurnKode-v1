// TODO: users table schema: UUID PK, normalized unique email/login identifier, profile fields, global role, status, timestamps.
// TODO: password hash có thể nằm trong credential field/table do M1 sở hữu; không expose qua response schema.
// TODO: xác định role lưu enum/lookup; giữ role values thống nhất với JWT và M2 contract.
// TODO: đặt indexes/constraints cho login lookup, unique identifier, role/status; không đưa entities M2 vào schema.
