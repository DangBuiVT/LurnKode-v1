import { t } from 'elysia';

// Schema dùng chung cho tham số :id hoặc :courseId, :chapterId, :lessonId trên URL
export const IdParamSchema = t.Object({
  id: t.String({ format: 'uuid' }),
});

// 1. Course Schemas
export const CreateCourseBodySchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String()),
});

export const ListCoursesQuerySchema = t.Object({
  page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
  limit: t.Optional(t.Numeric({ default: 20, minimum: 1, maximum: 100 })),
  search: t.Optional(t.String()),
});

export const UpdateCourseBodySchema = t.Object({
  // TODO: Định nghĩa các trường optional: title (string), description (string), status ('draft' | 'published' dùng t.Union([t.Literal('draft'), t.Literal('published')]))
  title: t.Optional(t.String({minLength: 1, maxLength: 255})),
  description: t.Optional(t.String()),
  status: t.Optional(t.Union([t.Literal('draft'), t.Literal('published')])),
  },
  { minProperties: 1 }
);

// 2. Chapter Schemas
export const CreateChapterBodySchema = t.Object({
  // TODO: Định nghĩa title (bắt buộc) và orderIndex (optional integer >= 1, nếu không truyền sẽ tự tính trong service)
  title: t.String({minLength: 1, maxLength: 255}),
  orderIndex: t.Optional(t.Integer({ minimum: 1})),
});

export const UpdateChapterBodySchema = t.Object({
  // TODO: Định nghĩa title (optional) và orderIndex (optional integer >= 1)
  title: t.Optional(t.String({minLength: 1, maxLength: 255})),
  orderIndex: t.Optional(t.Integer({ minimum: 1})),
  },
  { minProperties: 1 }
);

// 3. Lesson Schemas
export const CreateLessonBodySchema = t.Object({
  // TODO: Định nghĩa title (bắt buộc) và orderIndex (optional integer >= 1)
  title: t.String({minLength: 1, maxLength: 255}),
  orderIndex: t.Optional(t.Integer({ minimum: 1})),
});

export const UpdateLessonBodySchema = t.Object({
  // TODO: Định nghĩa title (optional) và orderIndex (optional integer >= 1)
  title: t.Optional(t.String({minLength: 1, maxLength: 255})),
  orderIndex: t.Optional(t.Integer({ minimum: 1})),
  },
  { minProperties: 1 }
);

// 4. Material Schemas
export const CreateMaterialBodySchema = t.Object({
  // TODO: Định nghĩa:
  // - type: 'video' | 'markdown' | 'slide'
  // - title: string (minLength: 1, maxLength: 255)
  // - contentUrl: optional string
  // - textContent: optional string
  // - metadata: optional Record<string, any>
  // - isRagSource: optional boolean (mặc định false), bo mac dinh false
  type: t.Union([t.Literal('video'), t.Literal('markdown'), t.Literal('slide')]),
  title: t.String({minLength: 1, maxLength: 255}),
  contentUrl: t.Optional(t.String()),
  textContent: t.Optional(t.String()),
  metadata: t.Optional(t.Record(t.String(), t.Any())),
  isRagSource: t.Optional(t.Boolean({}))
});

export const UpdateMaterialBodySchema = t.Partial(CreateMaterialBodySchema, { minProperties: 1 });