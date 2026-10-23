import { NotImplemented } from "./domain/errors.ts";

// Giữ guard fail-closed. Chưa có adapters thật, không mở HTTP server.
if (process.env.NODE_ENV === "production") throw new Error("Production adapters are not implemented");
if (process.env.RAG_MODE !== "mock" || process.env.ALLOW_FAKE_PROVIDERS !== "true") {
  throw new Error("Startup guard requires RAG_MODE=mock and ALLOW_FAKE_PROVIDERS=true; implementation is still missing");
}
// TODO: Sau khi tự triển khai config, adapters, services và app, nối chúng tại đây.
// TODO: Chỉ bind local 127.0.0.1; không bỏ guard trước integration/security review.
throw new NotImplemented("startup — skeleton chưa có server");
