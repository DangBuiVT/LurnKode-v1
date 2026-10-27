/** Lỗi dùng chung cho các bài tập chưa triển khai. */
export class NotImplemented extends Error {
  constructor(feature: string) {
    super(`NotImplemented: ${feature}`);
    this.name = "NotImplemented";
  }
}

export class AccessDenied extends Error { constructor() { super("Access denied"); } }
export class MissingResource extends Error { constructor() { super("Resource not found"); } }
export class InvalidInput extends Error { constructor(message = "Invalid input") { super(message); } }
export class Unauthenticated extends Error { constructor() { super("Authentication required"); } }
export class InvalidOutput extends Error { constructor(message = "Invalid output") { super(message); } }

/** Lỗi placeholder cho adapter parser chưa triển khai. */
export class ParserNotImplemented extends NotImplemented {
  constructor(format: string) { super(`parser ${format}`); }
}
