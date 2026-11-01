/**
 * ============================================================================
 * Production Integration Test Suite — LurnKode Ecosystem (M1 + M2 + M5)
 * ============================================================================
 * Verifies live communication across:
 * - Backend API Gateway (M1 Auth + M2 Learning): http://localhost:8000
 * - Frontend Web UI (M5 Next.js): http://localhost:3001
 * - PostgreSQL DB & Redis containers
 * ============================================================================
 */

import { randomUUID } from "node:crypto";
import { Client } from "pg";

const API_BASE = process.env.API_BASE_URL || "http://localhost:8000";
const UI_BASE = process.env.UI_BASE_URL || "http://localhost:3001";
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || "lurnkode_internal_secret_key_m4";
const DB_URL = process.env.DATABASE_URL || "postgresql://lurnkode_user:lurnkode_password@localhost:5432/lurnkode_db";

let passedCount = 0;
let failedCount = 0;

function logTest(id: string, name: string, success: boolean, detail?: string) {
  const symbol = success ? "\x1b[32m✔ PASS\x1b[0m" : "\x1b[31m✖ FAIL\x1b[0m";
  console.log(`[${symbol}] [${id}] ${name}`);
  if (detail) {
    console.log(`       ↳ \x1b[90m${detail}\x1b[0m`);
  }
  if (success) passedCount++;
  else failedCount++;
}

async function runIntegrationTests() {
  console.log("\n============================================================");
  console.log("🚀 STARTING PRODUCTION INTEGRATION TEST SUITE (E2E)");
  console.log(`Backend API Target:  ${API_BASE}`);
  console.log(`Frontend UI Target:  ${UI_BASE}`);
  console.log(`Database Target:     ${DB_URL.replace(/:[^:]*@/, ":****@")}`);
  console.log("============================================================\n");

  const pgClient = new Client({ connectionString: DB_URL });
  let dbConnected = false;
  try {
    await pgClient.connect();
    dbConnected = true;
  } catch (e: any) {
    console.warn(`[WARN] Direct DB connection skipped (${e.message})`);
  }

  // =========================================================================
  // TEST SUITE 1: CONNECTIVITY, HEALTH & CORS
  // =========================================================================
  console.log("\x1b[36m--- SUITE 1: Connectivity, Health & CORS Configuration ---\x1b[0m");

  // 1.1 Backend Health
  try {
    const res = await fetch(`${API_BASE}/health`);
    const json = (await res.json()) as { status: string };
    logTest("1.1", "Backend Liveness Check (/health)", res.status === 200 && json.status === "ok");
  } catch (e: any) {
    logTest("1.1", "Backend Liveness Check (/health)", false, e.message);
  }

  // 1.2 JWKS Discovery
  try {
    const res = await fetch(`${API_BASE}/.well-known/jwks.json`);
    const json = (await res.json()) as { keys: any[] };
    logTest(
      "1.2",
      "Public JWKS Endpoint (/.well-known/jwks.json)",
      res.status === 200 && Array.isArray(json.keys) && json.keys.length > 0 && json.keys[0].kty === "RSA",
      `Keys exported: ${json?.keys?.length ?? 0}`
    );
  } catch (e: any) {
    logTest("1.2", "Public JWKS Endpoint", false, e.message);
  }

  // 1.3 CORS Allowlist for Frontend
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: "OPTIONS",
      headers: {
        Origin: UI_BASE,
        "Access-Control-Request-Method": "GET",
      },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    const allowCreds = res.headers.get("access-control-allow-credentials");
    logTest(
      "1.3",
      `CORS Preflight Check for Frontend Origin (${UI_BASE})`,
      allowOrigin === UI_BASE && allowCreds === "true",
      `Origin: ${allowOrigin}, Credentials: ${allowCreds}`
    );
  } catch (e: any) {
    logTest("1.3", "CORS Preflight Check", false, e.message);
  }

  // 1.4 Frontend Web UI Liveness
  try {
    const res = await fetch(UI_BASE, { redirect: "manual" });
    const isOkOrRedirect = res.status === 200 || res.status === 307;
    logTest(
      "1.4",
      "Frontend Next.js Server Liveness",
      isOkOrRedirect,
      `HTTP Status: ${res.status} (Redirects to /course/catalog)`
    );
  } catch (e: any) {
    logTest("1.4", "Frontend Next.js Server Liveness", false, e.message);
  }

  // =========================================================================
  // TEST SUITE 2: M1 AUTHENTICATION & IDENTITY LIFECYCLE
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 2: M1 Auth & Identity Lifecycle ---\x1b[0m");

  const testId = randomUUID().substring(0, 8);
  const learnerEmail = `learner.${testId}@test.lurnkode.com`;
  const instructorEmail = `inst.${testId}@test.lurnkode.com`;
  const defaultPassword = "Password123!@#";

  let learnerToken = "";
  let learnerUserId = "";
  let instructorToken = "";
  let instructorUserId = "";

  // 2.1 Public Learner Registration
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: learnerEmail,
        password: defaultPassword,
        fullName: "Test Learner",
      }),
    });
    const json = (await res.json()) as any;
    const cookie = res.headers.get("set-cookie");
    learnerToken = json.data?.accessToken;
    learnerUserId = json.data?.userId;

    logTest(
      "2.1",
      "Learner Self-Registration (POST /api/v1/auth/register)",
      res.status === 201 && Boolean(learnerToken) && json.data?.role === "Learner",
      `Assigned Role: ${json.data?.role}, User ID: ${learnerUserId}, Has Cookie: ${Boolean(cookie)}`
    );
  } catch (e: any) {
    logTest("2.1", "Learner Self-Registration", false, e.message);
  }

  // 2.2 Verify Identity from Token
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    logTest(
      "2.2",
      "Authenticate Identity (/api/v1/auth/me)",
      res.status === 200 && json.data?.userId === learnerUserId,
      `Verified caller: ${json.data?.userId} (${json.data?.role})`
    );
  } catch (e: any) {
    logTest("2.2", "Authenticate Identity", false, e.message);
  }

  // 2.3 Deny Access Without Token
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`);
    logTest(
      "2.3",
      "Deny Protected Route Without Bearer Token",
      res.status === 401,
      `HTTP Status: ${res.status}`
    );
  } catch (e: any) {
    logTest("2.3", "Deny Protected Route", false, e.message);
  }

  // 2.4 Learner Login
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: learnerEmail,
        password: defaultPassword,
      }),
    });
    const json = (await res.json()) as any;
    logTest(
      "2.4",
      "Learner Login & Token Issuance (POST /api/v1/auth/login)",
      res.status === 200 && Boolean(json.data?.accessToken),
      `Token Type: ${json.data?.tokenType}, Expires In: ${json.data?.expiresIn}s`
    );
  } catch (e: any) {
    logTest("2.4", "Learner Login", false, e.message);
  }

  // 2.5 Instructor Registration & Promotion
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: instructorEmail,
        password: defaultPassword,
        fullName: "Professor Ada Lovelace",
      }),
    });
    const json = (await res.json()) as any;
    instructorUserId = json.data?.userId;

    if (dbConnected) {
      await pgClient.query("UPDATE users SET role = 'Instructor' WHERE id = $1", [instructorUserId]);
      // Re-login to issue JWT with role: 'Instructor'
      const loginRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: instructorEmail, password: defaultPassword }),
      });
      const loginJson = (await loginRes.json()) as any;
      instructorToken = loginJson.data?.accessToken;
    }

    logTest(
      "2.5",
      "Instructor Provisioning & Role Upgrade",
      Boolean(instructorToken) && Boolean(instructorUserId),
      `Instructor ID: ${instructorUserId}, Token issued: ${Boolean(instructorToken)}`
    );
  } catch (e: any) {
    logTest("2.5", "Instructor Provisioning", false, e.message);
  }

  // =========================================================================
  // TEST SUITE 3: M2 CURRICULUM CREATION & MANAGEMENT (INSTRUCTOR)
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 3: M2 Curriculum Authoring & Publishing ---\x1b[0m");

  let createdCourseId = "";
  let createdChapterId = "";
  let lesson1Id = "";
  let lesson2Id = "";
  let materialId = "";

  // 3.1 Instructor Creates Course
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        title: `Fullstack Cloud Engineering - ${testId}`,
        description: "Master modern microservices with Bun, Next.js, and PostgreSQL.",
      }),
    });
    const json = (await res.json()) as any;
    createdCourseId = json.data?.id;
    logTest(
      "3.1",
      "Instructor Creates New Course (POST /api/v1/courses)",
      res.status === 201 && Boolean(createdCourseId) && json.data?.status === "draft",
      `Course ID: ${createdCourseId}, Status: ${json.data?.status}`
    );
  } catch (e: any) {
    logTest("3.1", "Instructor Creates Course", false, e.message);
  }

  // 3.2 Instructor Creates Chapter
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}/chapters`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        title: "Chapter 1: Distributed Architecture",
        orderIndex: 1,
      }),
    });
    const json = (await res.json()) as any;
    createdChapterId = json.data?.id;
    logTest(
      "3.2",
      "Instructor Creates Chapter (POST /courses/:id/chapters)",
      res.status === 201 && Boolean(createdChapterId),
      `Chapter ID: ${createdChapterId}, OrderIndex: ${json.data?.orderIndex}`
    );
  } catch (e: any) {
    logTest("3.2", "Instructor Creates Chapter", false, e.message);
  }

  // 3.3 Instructor Creates Lesson 1 & Lesson 2
  try {
    const res1 = await fetch(`${API_BASE}/api/v1/chapters/${createdChapterId}/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        title: "Lesson 1: RS256 JWT Authentication",
        orderIndex: 1,
      }),
    });
    const json1 = (await res1.json()) as any;
    lesson1Id = json1.data?.id;

    const res2 = await fetch(`${API_BASE}/api/v1/chapters/${createdChapterId}/lessons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        title: "Lesson 2: Sequential Learning Progression",
        orderIndex: 2,
      }),
    });
    const json2 = (await res2.json()) as any;
    lesson2Id = json2.data?.id;

    logTest(
      "3.3",
      "Instructor Creates Ordered Lessons (POST /chapters/:id/lessons)",
      res1.status === 201 && res2.status === 201 && Boolean(lesson1Id) && Boolean(lesson2Id),
      `Lesson 1 ID: ${lesson1Id}, Lesson 2 ID: ${lesson2Id}`
    );
  } catch (e: any) {
    logTest("3.3", "Instructor Creates Ordered Lessons", false, e.message);
  }

  // 3.4 Instructor Attaches Markdown Material with RAG Flag
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson1Id}/materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        type: "markdown",
        title: "RS256 JWT Security Guide",
        textContent: "# RS256 Cryptography\nAsymmetric signatures allow decentralized verification across microservices.",
        isRagSource: true,
      }),
    });
    const json = (await res.json()) as any;
    materialId = json.data?.id;
    logTest(
      "3.4",
      "Attach Markdown Material (POST /lessons/:id/materials, isRagSource: true)",
      res.status === 201 && Boolean(materialId) && json.data?.isRagSource === true,
      `Material ID: ${materialId}, Type: ${json.data?.type}`
    );
  } catch (e: any) {
    logTest("3.4", "Attach Markdown Material", false, e.message);
  }

  // 3.5 Publish the Course
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({ status: "published" }),
    });
    const json = (await res.json()) as any;
    logTest(
      "3.5",
      "Publish Course (PATCH /courses/:id -> status: published)",
      res.status === 200 && json.data?.status === "published",
      `Course status updated to: ${json.data?.status}`
    );
  } catch (e: any) {
    logTest("3.5", "Publish Course", false, e.message);
  }

  // =========================================================================
  // TEST SUITE 4: FRONTEND CATALOG & COURSE DETAILS (M5 $\leftrightarrow$ M2)
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 4: Frontend Catalog & Detail Retrieval (M5 <-> M2) ---\x1b[0m");

  // 4.1 Verify Published Course Appears in Catalog
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses?search=${testId}`);
    const json = (await res.json()) as any;
    const found = json.data?.some((c: any) => c.id === createdCourseId);
    logTest(
      "4.1",
      "Published Course Appears in Public Catalog Search",
      res.status === 200 && found,
      `Found course in catalog: ${found}`
    );
  } catch (e: any) {
    logTest("4.1", "Course Catalog Search", false, e.message);
  }

  // 4.2 Fetch Full Course Hierarchy
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}`);
    const json = (await res.json()) as any;
    const chapters = json.data?.chapters || [];
    const lessons = chapters[0]?.lessons || [];
    logTest(
      "4.2",
      "Retrieve Full Course Curriculum Tree (Chapters & Lessons)",
      res.status === 200 && chapters.length === 1 && lessons.length === 2,
      `Chapters: ${chapters.length}, Lessons in Ch1: ${lessons.length}`
    );
  } catch (e: any) {
    logTest("4.2", "Retrieve Course Tree", false, e.message);
  }

  // =========================================================================
  // TEST SUITE 5: SEQUENTIAL PROGRESSION & ENROLLMENT (M5 $\leftrightarrow$ M2)
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 5: Sequential Progression & Enrollment Integrity ---\x1b[0m");

  // 5.1 Instructor cannot self-enroll
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${instructorToken}` },
    });
    logTest(
      "5.1",
      "Constraint 2: Deny Instructor Self-Enrollment (403)",
      res.status === 403,
      `HTTP Status: ${res.status}`
    );
  } catch (e: any) {
    logTest("5.1", "Deny Instructor Self-Enrollment", false, e.message);
  }

  // 5.2 Learner Enrolls
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    logTest(
      "5.2",
      "Learner Enrolls in Course (POST /courses/:id/enroll -> 201)",
      res.status === 201 && json.data?.courseId === createdCourseId,
      `Enrollment ID: ${json.data?.id}, lastAccessedLesson: ${json.data?.lastAccessedLessonId ?? "null"}`
    );
  } catch (e: any) {
    logTest("5.2", "Learner Enrolls in Course", false, e.message);
  }

  // 5.3 Duplicate Enrollment Blocked
  try {
    const res = await fetch(`${API_BASE}/api/v1/courses/${createdCourseId}/enroll`, {
      method: "POST",
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    logTest(
      "5.3",
      "Block Duplicate Enrollment (409 Conflict)",
      res.status === 409,
      `HTTP Status: ${res.status}`
    );
  } catch (e: any) {
    logTest("5.3", "Block Duplicate Enrollment", false, e.message);
  }

  // 5.4 Sequential Constraint 4: Learner skips to Lesson 2 -> 403 SEQUENTIAL_PREREQUISITE_FAILED
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson2Id}/access`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    logTest(
      "5.4",
      "Constraint 4: Block Skipping to Lesson 2 (403 SEQUENTIAL_PREREQUISITE_FAILED)",
      res.status === 403 && json.error?.code === "SEQUENTIAL_PREREQUISITE_FAILED",
      `Error Code: ${json.error?.code}`
    );
  } catch (e: any) {
    logTest("5.4", "Block Skipping Lesson", false, e.message);
  }

  // 5.5 Learner Accesses Lesson 1
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson1Id}/access`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    logTest(
      "5.5",
      "Learner Accesses Lesson 1 & Receives Materials (200 OK)",
      res.status === 200 && Array.isArray(json.data) && json.data.length >= 1,
      `Materials returned: ${json.data?.length}`
    );
  } catch (e: any) {
    logTest("5.5", "Learner Accesses Lesson 1", false, e.message);
  }

  // 5.6 Learner Completes Lesson 1 -> Progress Advances
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson1Id}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    logTest(
      "5.6",
      "Learner Completes Lesson 1 (POST /lessons/:id/complete -> 200)",
      res.status === 200 && json.data?.lastAccessedLessonId === lesson1Id,
      `Updated lastAccessedLessonId: ${json.data?.lastAccessedLessonId}`
    );
  } catch (e: any) {
    logTest("5.6", "Learner Completes Lesson 1", false, e.message);
  }

  // 5.7 Lesson 2 is now unlocked!
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson2Id}/access`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    logTest(
      "5.7",
      "Sequential Unlock: Lesson 2 Accessible After Lesson 1 Complete (200 OK)",
      res.status === 200,
      `HTTP Status: ${res.status}`
    );
  } catch (e: any) {
    logTest("5.7", "Sequential Unlock Lesson 2", false, e.message);
  }

  // =========================================================================
  // TEST SUITE 6: DISCUSSIONS & NOTIFICATIONS INTERACTION
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 6: Discussions & Notification Triggers ---\x1b[0m");

  let rootDiscussionId = "";

  // 6.1 Learner Posts Discussion on Lesson 1
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson1Id}/discussions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        textContent: "Does RS256 use public and private keys simultaneously?",
      }),
    });
    const json = (await res.json()) as any;
    rootDiscussionId = json.data?.id;
    logTest(
      "6.1",
      "Learner Posts Discussion Question (POST /lessons/:id/discussions)",
      res.status === 201 && Boolean(rootDiscussionId),
      `Discussion ID: ${rootDiscussionId}`
    );
  } catch (e: any) {
    logTest("6.1", "Learner Posts Discussion", false, e.message);
  }

  // 6.2 Instructor Replies -> Triggers Notification for Learner
  try {
    const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson1Id}/discussions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${instructorToken}`,
      },
      body: JSON.stringify({
        textContent: "Yes! The private key signs the token, and the public key verifies it.",
        parentId: rootDiscussionId,
      }),
    });
    const json = (await res.json()) as any;
    logTest(
      "6.2",
      "Instructor Replies to Discussion & Triggers Notification",
      res.status === 201 && json.data?.parentId === rootDiscussionId,
      `Reply ID: ${json.data?.id}`
    );
  } catch (e: any) {
    logTest("6.2", "Instructor Replies to Discussion", false, e.message);
  }

  // 6.3 Learner Receives Notification
  let notifId = "";
  try {
    const res = await fetch(`${API_BASE}/api/v1/notifications`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    const json = (await res.json()) as any;
    const notifs = json.data || [];
    notifId = notifs[0]?.id;
    logTest(
      "6.3",
      "Learner Receives Discussion Reply Notification (GET /notifications)",
      res.status === 200 && notifs.length >= 1,
      `Received ${notifs.length} notification(s)`
    );
  } catch (e: any) {
    logTest("6.3", "Learner Receives Notification", false, e.message);
  }

  // 6.4 Learner Marks Notification as Read
  if (notifId) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/notifications/${notifId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${learnerToken}` },
      });
      const json = (await res.json()) as any;
      logTest(
        "6.4",
        "Mark Notification as Read (PATCH /notifications/:id/read)",
        res.status === 200 && json.data?.isRead === true,
        `isRead: ${json.data?.isRead}`
      );
    } catch (e: any) {
      logTest("6.4", "Mark Notification Read", false, e.message);
    }
  }

  // =========================================================================
  // TEST SUITE 7: M4 RAG AI TUTOR KNOWLEDGE INGESTION
  // =========================================================================
  console.log("\n\x1b[36m--- SUITE 7: M4 RAG Knowledge Ingestion Pipeline ---\x1b[0m");

  try {
    const res = await fetch(`${API_BASE}/internal/rag-materials`, {
      headers: { "x-internal-service-key": INTERNAL_KEY },
    });
    const json = (await res.json()) as any;
    const foundRagMaterial = json.data?.some((item: any) => item.courseId === createdCourseId);
    logTest(
      "7.1",
      "M4 Knowledge Ingestion: Live Material Export with Context",
      res.status === 200 && foundRagMaterial,
      `Extracted materials count: ${json.data?.length}, Matched created course: ${foundRagMaterial}`
    );
  } catch (e: any) {
    logTest("7.1", "M4 Knowledge Ingestion", false, e.message);
  }

  // =========================================================================
  // CLEANUP TEST DATA
  // =========================================================================
  if (dbConnected) {
    try {
      if (createdCourseId) {
        await pgClient.query("DELETE FROM courses WHERE id = $1", [createdCourseId]);
      }
      if (learnerUserId && instructorUserId) {
        await pgClient.query("DELETE FROM users WHERE id IN ($1, $2)", [learnerUserId, instructorUserId]);
      }
      await pgClient.end();
    } catch {
      // Ignore cleanup error
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n============================================================");
  console.log("📊 INTEGRATION TEST SUITE SUMMARY");
  console.log(`Total Scenarios Executed: ${passedCount + failedCount}`);
  console.log(`\x1b[32mPassed: ${passedCount}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failedCount}\x1b[0m`);
  console.log(`Success Rate: ${Math.round((passedCount / (passedCount + failedCount || 1)) * 100)}%`);
  console.log("============================================================\n");
  process.exit(failedCount > 0 ? 1 : 0);
}

runIntegrationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
