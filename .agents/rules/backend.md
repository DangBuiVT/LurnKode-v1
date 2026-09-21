# Backend Rules — LurnKode LMS

## API Design
- Tất cả endpoints phải có prefix `/api/`
- Versioning khi breaking change: `/api/v2/...`
- Sử dụng HTTP status codes đúng: 200, 201, 400, 401, 403, 404, 422, 500
- Response format nhất quán:
  ```json
  { "data": {...}, "error": null }
  { "data": null, "error": "message" }
  ```

## Validation
- Validate ALL user input ở server-side (không trust client)
- Sử dụng Elysia `t.Object()` cho schema validation — không dùng `any`
- Max code size: 64KB
- UUID validation cho tất cả ID params

## Error Handling
- Không expose internal errors tới user (log internally)
- Wrap judge worker / Docker sandbox calls trong try/catch với fail-safe response
- Database errors phải được caught và return 500

## Async / Performance
- Sử dụng async/await (không blocking operations)
- Batch database queries khi có thể
- Programming submissions phải đi qua submission queue (không sync blocking)

## Logging
- Log: request method, path, status, duration
- KHÔNG log: passwords, tokens, full code submissions (redact)
