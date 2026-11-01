import { Pool } from "pg";
import { hashPassword } from "../apps/api/src/utils/password";

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://lurnkode_user:lurnkode_password@localhost:5432/lurnkode_db";

async function seed() {
  console.log("🌱 SEEDING PRODUCTION COURSES AND INSTRUCTORS...");
  const pool = new Pool({ connectionString: DB_URL });

  try {
    const passwordHash = await hashPassword("LurnKode@2026!");

    // 1. Seed Instructors
    const instructorsData = [
      {
        email: "toan.nguyen@lurnkode.edu",
        fullName: "TS. Nguyễn Văn Toàn",
        role: "Instructor",
      },
      {
        email: "nam.le@lurnkode.edu",
        fullName: "ThS. Lê Hoàng Nam",
        role: "Instructor",
      },
      {
        email: "khoa.tran@lurnkode.edu",
        fullName: "TS. Trần Minh Khoa",
        role: "Instructor",
      },
    ];

    const instructorMap = new Map<string, string>();

    for (const inst of instructorsData) {
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'Instructor'
         RETURNING id`,
        [inst.email, passwordHash, inst.fullName, inst.role]
      );
      const userId = userRes.rows[0].id;
      await pool.query(
        `INSERT INTO instructors (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
        [userId]
      );
      instructorMap.set(inst.email, userId);
      console.log(`  👤 Instructor: ${inst.fullName} (${inst.email}) -> ${userId}`);
    }

    // 2. Seed Courses Data
    const coursesData = [
      {
        title: "Cấu trúc Dữ liệu & Giải thuật (Data Structures & Algorithms)",
        description:
          "Nắm vững các cấu trúc dữ liệu cốt lõi (Array, Linked List, Stack, Queue, Hash Table, Tree, Graph) và kỹ thuật phân tích độ phức tạp Big-O phục vụ phỏng vấn kỹ thuật và phát triển phần mềm hiệu năng cao.",
        instructorEmail: "toan.nguyen@lurnkode.edu",
        chapters: [
          {
            title: "Chương 1: Tổng quan & Phân tích Độ phức tạp (Big-O)",
            orderIndex: 1,
            lessons: [
              {
                title: "Bài 1: Giới thiệu Big-O Notation & Phân tích Thuật toán",
                orderIndex: 1,
                materials: [
                  {
                    title: "Lý thuyết: Phân tích độ phức tạp thời gian và không gian",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Tổng quan về Big-O Notation

Big-O Notation là công cụ toán học dùng để mô tả giới hạn trên (upper bound) của thời gian chạy hoặc dung lượng bộ nhớ mà một thuật toán tiêu tốn khi kích thước dữ liệu đầu vào \\(N\\) tiến tới vô cùng.

## 1. Các cấp độ độ phức tạp thường gặp
- **\\(O(1)\\) - Constant Time**: Thời gian thực thi không phụ thuộc vào kích thước dữ liệu (ví dụ: truy xuất phần tử mảng qua index).
- **\\(O(\\log N)\\) - Logarithmic Time**: Thời gian chạy giảm dần tốc độ tăng khi dữ liệu tăng (ví dụ: Binary Search).
- **\\(O(N)\\) - Linear Time**: Thời gian chạy tỉ lệ thuận trực tiếp với kích thước dữ liệu (ví dụ: duyệt tuần tự một mảng).
- **\\(O(N \\log N)\\) - Linearithmic Time**: Tối ưu nhất cho các giải thuật sắp xếp dựa trên so sánh (ví dụ: Merge Sort, Quick Sort trung bình).
- **\\(O(N^2)\\) - Quadratic Time**: Hai vòng lặp lồng nhau duyệt qua dữ liệu (ví dụ: Bubble Sort, Selection Sort).

## 2. Quy tắc đơn giản hóa Big-O
1. Bỏ qua hằng số: \\(O(2N) \\rightarrow O(N)\\), \\(O(100) \\rightarrow O(1)\\).
2. Giữ lại số hạng có bậc cao nhất: \\(O(N^2 + 5N + 10) \\rightarrow O(N^2)\\).`,
                  },
                ],
              },
              {
                title: "Bài 2: Mảng động (Dynamic Array) & Kỹ thuật Two Pointers",
                orderIndex: 2,
                materials: [
                  {
                    title: "Thực hành: Kỹ thuật Two Pointers trong xử lý chuỗi và mảng",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Kỹ thuật Two Pointers (Hai con trỏ)

Kỹ thuật Hai con trỏ là phương pháp tối ưu cực kỳ phổ biến giúp giảm độ phức tạp từ \\(O(N^2)\\) xuống \\(O(N)\\) khi xử lý mảng đã sắp xếp hoặc tìm chuỗi con đối xứng.

## 1. Phương pháp Hai con trỏ đối đầu (Opposite Direction)
Áp dụng cho bài toán mảng đã sắp xếp (ví dụ bài toán Two Sum II, Container With Most Water, Palindrome):
- Con trỏ trái: \`left = 0\`
- Con trỏ phải: \`right = arr.length - 1\`
- Di chuyển dần hai con trỏ vào giữa dựa trên điều kiện so sánh.`,
                  },
                ],
              },
            ],
          },
          {
            title: "Chương 2: Cấu trúc Dữ liệu Tuyến tính (Linked List, Stack, Queue)",
            orderIndex: 2,
            lessons: [
              {
                title: "Bài 3: Danh sách liên kết đơn (Singly Linked List)",
                orderIndex: 1,
                materials: [
                  {
                    title: "Cơ chế quản lý bộ nhớ và thao tác trên Linked List",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Danh sách liên kết đơn (Singly Linked List)

Khác với mảng lưu trữ các phần tử tại các ô nhớ liên tục, Linked List lưu trữ các node rời rạc trong heap, mỗi node chứa dữ liệu và con trỏ trỏ tới node tiếp theo.

## Ưu điểm và nhược điểm
- **Ưu điểm**: Thêm và xóa ở đầu danh sách với chi phí \\(O(1)\\) không cần dịch chuyển dữ liệu.
- **Nhược điểm**: Không hỗ trợ truy cập ngẫu nhiên qua index (random access), chi phí tìm kiếm \\(O(N)\\).`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Lập trình Web Hiện đại với Next.js 16 & React 19",
        description:
          "Học cách thiết kế và phát triển ứng dụng Full-stack hiện đại với Next.js App Router, React Server Components (RSC), Server Actions, tối ưu hóa Core Web Vitals và triển khai Docker chuẩn production.",
        instructorEmail: "nam.le@lurnkode.edu",
        chapters: [
          {
            title: "Chương 1: Kiến trúc App Router & React Server Components",
            orderIndex: 1,
            lessons: [
              {
                title: "Bài 1: Khác biệt giữa Server Components và Client Components",
                orderIndex: 1,
                materials: [
                  {
                    title: "Kiến trúc Server-First trong Next.js App Router",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# React Server Components (RSC) trong Next.js

Next.js App Router áp dụng triết lý Server-First: Mọi component mặc định là Server Component, chỉ thực thi trên server và gửi HTML kèm streaming payload về cho trình duyệt.

## 1. Khi nào dùng Server Component?
- Đọc trực tiếp từ cơ sở dữ liệu hoặc hệ thống file.
- Giữ các secret API keys không bị lộ về client.
- Giảm dung lượng JavaScript bundle tải về trình duyệt.

## 2. Khi nào cần 'use client'?
- Cần tương tác người dùng: sự kiện \`onClick\`, \`onChange\`.
- Sử dụng React hooks: \`useState\`, \`useEffect\`, \`useMemo\`.
- Sử dụng Browser APIs: \`window\`, \`localStorage\`, \`navigator\`.`,
                  },
                ],
              },
              {
                title: "Bài 2: Tối ưu dữ liệu với Server Actions & Revalidation",
                orderIndex: 2,
                materials: [
                  {
                    title: "Xử lý Form Mutation và Revalidate Path",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Server Actions trong Next.js

Server Actions cho phép client gọi các hàm async chạy trên server mà không cần phải tự tạo REST endpoint riêng biệt, tích hợp trực tiếp với thẻ \`<form>\`.`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Hệ Quản trị Cơ sở Dữ liệu & SQL Nâng cao",
        description:
          "Chuyên sâu về thiết kế lược đồ quan hệ, chuẩn hóa dữ liệu 3NF/BCNF, tối ưu chỉ mục (B-Tree/Hash/GIN/GiST), điều phối Transaction Isolation Levels và truy vấn phân tích nâng cao (Window Functions).",
        instructorEmail: "khoa.tran@lurnkode.edu",
        chapters: [
          {
            title: "Chương 1: Thiết kế Cơ sở Dữ liệu & Chuẩn hóa 3NF",
            orderIndex: 1,
            lessons: [
              {
                title: "Bài 1: Thiết kế Lược đồ & Các quy tắc Chuẩn hóa Dữ liệu",
                orderIndex: 1,
                materials: [
                  {
                    title: "Chuẩn hóa quan hệ từ 1NF đến Boyce-Codd (BCNF)",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Chuẩn hóa Cơ sở Dữ liệu Quan hệ

Chuẩn hóa (Normalization) là quá trình tổ chức các bảng nhằm giảm thiểu tính dư thừa dữ liệu (data redundancy) và loại bỏ các dị thường (anomalies) khi thêm, sửa, xóa.`,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: "Xây dựng AI Tutor & Ứng dụng RAG với Vector Database",
        description:
          "Tìm hiểu toàn diện kiến trúc RAG (Retrieval-Augmented Generation): tiền xử lý tài liệu học tập, Chunking chiến lược, Vector Embedding với pgvector, truy vấn ngữ nghĩa Cosine Similarity và sinh câu trả lời có trích dẫn nguồn (Citations).",
        instructorEmail: "toan.nguyen@lurnkode.edu",
        chapters: [
          {
            title: "Chương 1: Kiến trúc RAG & pgvector cơ bản",
            orderIndex: 1,
            lessons: [
              {
                title: "Bài 1: Tổng quan Kiến trúc Retrieval-Augmented Generation",
                orderIndex: 1,
                materials: [
                  {
                    title: "Nguyên lý hoạt động của Evidence-Based AI Tutor",
                    type: "markdown",
                    isRagSource: true,
                    textContent: `# Kiến trúc RAG (Retrieval-Augmented Generation)

RAG là kỹ thuật tăng cường khả năng của Large Language Models (LLMs) bằng cách truy xuất dữ liệu liên quan từ nguồn kiến thức bên ngoài (ví dụ học liệu của khóa học) trước khi đưa vào prompt của LLM.

## Lợi ích cốt lõi trong giáo dục:
1. **Loại bỏ Hallucination**: AI chỉ được trả lời dựa trên tài liệu bài học có căn cứ.
2. **Minh bạch (Evidence-Based)**: Trích dẫn rõ ràng số chương, bài học và đoạn văn nguồn.
3. **Bảo mật**: Dễ dàng kiểm soát phân quyền tài liệu theo trạng thái xuất bản (published).`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    for (const c of coursesData) {
      const instructorId = instructorMap.get(c.instructorEmail);
      if (!instructorId) continue;

      // Check if course already exists
      const existingCourseRes = await pool.query(
        "SELECT id FROM courses WHERE title = $1",
        [c.title]
      );

      let courseId: string;
      if (existingCourseRes.rows.length > 0) {
        courseId = existingCourseRes.rows[0].id;
        await pool.query(
          "UPDATE courses SET description = $1, status = 'published', instructor_id = $2 WHERE id = $3",
          [c.description, instructorId, courseId]
        );
        console.log(`  🔄 Updated Course: "${c.title}" -> ${courseId}`);
      } else {
        const insertRes = await pool.query(
          `INSERT INTO courses (instructor_id, title, description, status)
           VALUES ($1, $2, $3, 'published')
           RETURNING id`,
          [instructorId, c.title, c.description]
        );
        courseId = insertRes.rows[0].id;
        console.log(`  ✨ Created Course: "${c.title}" -> ${courseId}`);
      }

      for (const ch of c.chapters) {
        const chRes = await pool.query(
          `INSERT INTO chapters (course_id, title, order_index)
           VALUES ($1, $2, $3)
           ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
           RETURNING id`,
          [courseId, ch.title, ch.orderIndex]
        );
        const chapterId = chRes.rows[0].id;

        for (const les of ch.lessons) {
          const lesRes = await pool.query(
            `INSERT INTO lessons (chapter_id, title, order_index)
             VALUES ($1, $2, $3)
             ON CONFLICT (chapter_id, order_index) DO UPDATE SET title = EXCLUDED.title
             RETURNING id`,
            [chapterId, les.title, les.orderIndex]
          );
          const lessonId = lesRes.rows[0].id;

          for (const mat of les.materials) {
            await pool.query(
              `INSERT INTO materials (lesson_id, type, title, text_content, is_rag_source)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`,
              [lessonId, mat.type, mat.title, mat.textContent, mat.isRagSource]
            );
          }
        }
      }
    }

    console.log("✅ SEED COMPLETED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
