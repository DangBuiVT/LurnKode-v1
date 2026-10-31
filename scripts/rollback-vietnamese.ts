import { Pool } from "pg";

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://lurnkode_user:lurnkode_password@localhost:5432/lurnkode_db";

async function rollbackToVietnamese() {
  console.log("🇻🇳 ROLLBACK COURSES AND LESSONS TO VIETNAMESE (IN DATABASE)...");
  const pool = new Pool({ connectionString: DB_URL });

  try {
    // 1. Update Instructors
    const instructors = [
      { email: "toan.nguyen@lurnkode.edu", fullName: "TS. Nguyễn Văn Toàn" },
      { email: "nam.le@lurnkode.edu", fullName: "ThS. Lê Hoàng Nam" },
      { email: "khoa.tran@lurnkode.edu", fullName: "TS. Trần Minh Khoa" },
    ];

    for (const inst of instructors) {
      await pool.query(
        "UPDATE users SET full_name = $1 WHERE email = $2",
        [inst.fullName, inst.email]
      );
      console.log(`  👤 Updated Instructor: ${inst.fullName} (${inst.email})`);
    }

    // 2. Define Vietnamese course structure by ID
    const courses = [
      {
        id: "ef73cc88-2f48-4486-b87b-5e595c629e09",
        title: "Cấu trúc Dữ liệu & Giải thuật (Data Structures & Algorithms)",
        description:
          "Nắm vững các cấu trúc dữ liệu cốt lõi (Array, Linked List, Stack, Queue, Hash Table, Tree, Graph) và kỹ thuật phân tích độ phức tạp Big-O phục vụ phỏng vấn kỹ thuật và phát triển phần mềm hiệu năng cao.",
        chapters: [
          {
            orderIndex: 1,
            title: "Chương 1: Tổng quan & Phân tích Độ phức tạp (Big-O)",
            lessons: [
              {
                orderIndex: 1,
                title: "Bài 1: Giới thiệu Big-O Notation & Phân tích Thuật toán",
              },
              {
                orderIndex: 2,
                title: "Bài 2: Mảng động (Dynamic Array) & Kỹ thuật Two Pointers",
              },
            ],
          },
          {
            orderIndex: 2,
            title: "Chương 2: Cấu trúc Dữ liệu Tuyến tính (Linked List, Stack, Queue)",
            lessons: [
              {
                orderIndex: 1,
                title: "Bài 3: Danh sách liên kết đơn (Singly Linked List)",
              },
            ],
          },
        ],
      },
      {
        id: "7bfb6039-3f81-4f2e-84b3-cfad303e8d2c",
        title: "Lập trình Web Hiện đại với Next.js 16 & React 19",
        description:
          "Học cách thiết kế và phát triển ứng dụng Full-stack hiện đại với Next.js App Router, React Server Components (RSC), Server Actions, tối ưu hóa Core Web Vitals và triển khai Docker chuẩn production.",
        chapters: [
          {
            orderIndex: 1,
            title: "Chương 1: Kiến trúc App Router & React Server Components",
            lessons: [
              {
                orderIndex: 1,
                title: "Bài 1: Khác biệt giữa Server Components và Client Components",
              },
              {
                orderIndex: 2,
                title: "Bài 2: Tối ưu dữ liệu với Server Actions & Revalidation",
              },
            ],
          },
        ],
      },
      {
        id: "7ccf9f91-0c23-4d6f-9526-4eed9c35108f",
        title: "Hệ Quản trị Cơ sở Dữ liệu & SQL Nâng cao",
        description:
          "Chuyên sâu về thiết kế lược đồ quan hệ, chuẩn hóa dữ liệu 3NF/BCNF, tối ưu chỉ mục (B-Tree/Hash/GIN/GiST), điều phối Transaction Isolation Levels và truy vấn phân tích nâng cao (Window Functions).",
        chapters: [
          {
            orderIndex: 1,
            title: "Chương 1: Thiết kế Cơ sở Dữ liệu & Chuẩn hóa 3NF",
            lessons: [
              {
                orderIndex: 1,
                title: "Bài 1: Thiết kế Lược đồ & Các quy tắc Chuẩn hóa Dữ liệu",
              },
            ],
          },
        ],
      },
      {
        id: "53fae7d2-6fab-4dfe-9b65-ba976bdb4ae9",
        title: "Xây dựng AI Tutor & Ứng dụng RAG với Vector Database",
        description:
          "Tìm hiểu toàn diện kiến trúc RAG (Retrieval-Augmented Generation): tiền xử lý tài liệu học tập, Chunking chiến lược, Vector Embedding với pgvector, truy vấn ngữ nghĩa Cosine Similarity và sinh câu trả lời có trích dẫn nguồn (Citations).",
        chapters: [
          {
            orderIndex: 1,
            title: "Chương 1: Kiến trúc RAG & pgvector cơ bản",
            lessons: [
              {
                orderIndex: 1,
                title: "Bài 1: Tổng quan Kiến trúc Retrieval-Augmented Generation",
              },
            ],
          },
        ],
      },
    ];

    for (const c of courses) {
      await pool.query(
        "UPDATE courses SET title = $1, description = $2 WHERE id = $3",
        [c.title, c.description, c.id]
      );
      console.log(`  📚 Updated Course: "${c.title}"`);

      for (const ch of c.chapters) {
        const chRes = await pool.query(
          `INSERT INTO chapters (course_id, title, order_index)
           VALUES ($1, $2, $3)
           ON CONFLICT (course_id, order_index) DO UPDATE SET title = EXCLUDED.title
           RETURNING id`,
          [c.id, ch.title, ch.orderIndex]
        );
        const chapterId = chRes.rows[0].id;
        console.log(`    📁 Updated Chapter: "${ch.title}" (order ${ch.orderIndex})`);

        for (const les of ch.lessons) {
          await pool.query(
            `INSERT INTO lessons (chapter_id, title, order_index)
             VALUES ($1, $2, $3)
             ON CONFLICT (chapter_id, order_index) DO UPDATE SET title = EXCLUDED.title
             RETURNING id`,
            [chapterId, les.title, les.orderIndex]
          );
          console.log(`      📄 Updated Lesson: "${les.title}" (order ${les.orderIndex})`);
        }
      }
    }

    console.log("✅ VIETNAMESE ROLLBACK IN DATABASE COMPLETED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Rollback failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

rollbackToVietnamese().catch((err) => {
  console.error(err);
  process.exit(1);
});

