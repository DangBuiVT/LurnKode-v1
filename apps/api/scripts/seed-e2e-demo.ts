import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { validateLocalApiBase, validateLocalDemoDatabase } from "../src/scripts/demo-seed-guard";

const API_BASE_URL = validateLocalApiBase(process.env.API_BASE_URL || "http://localhost:8000");
const databaseTarget = validateLocalDemoDatabase(process.env.DATABASE_URL, process.env.DEMO_SEED_CONFIRM_DB);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");
const credentialsPath = path.join(scriptDirectory, "..", ".env.demo-accounts");
const dryRun = process.argv.includes("--dry-run");

const demoAccounts = [
  { key: "E2E_DEMO_INSTRUCTOR_1", email: "e2e-instructor1@lurnkode.test", fullName: "E2E Demo Instructor One", role: "Instructor" as const },
  { key: "E2E_DEMO_INSTRUCTOR_2", email: "e2e-instructor2@lurnkode.test", fullName: "E2E Demo Instructor Two", role: "Instructor" as const },
  { key: "E2E_DEMO_LEARNER", email: "e2e-learner@lurnkode.test", fullName: "E2E Demo Learner", role: "Learner" as const },
];

const courseSpecs = [
  {
    title: "Introduction to Programming",
    description: "A demo course for programming fundamentals, sequential learning, and course materials.",
    instructorEmail: demoAccounts[0].email,
    status: "published" as const,
    chapters: [
      {
        title: "Programming Foundations",
        lessons: [
          {
            title: "What Is a Program?",
            material: {
              type: "markdown" as const,
              title: "Programming Foundations Notes",
              textContent: "# What Is a Program?\n\nA program is a sequence of instructions that transforms input into output.\n\n## Learning goals\n- Identify input, processing, and output.\n- Describe an algorithm in plain language.",
              isRagSource: true,
            },
          },
          {
            title: "Variables and Values",
            material: {
              type: "video" as const,
              title: "Variables Video Lesson",
              contentUrl: "https://example.com/lurnkode-demo-variables.mp4",
              isRagSource: false,
            },
          },
        ],
      },
      {
        title: "Control Flow and Problem Solving",
        lessons: [
          {
            title: "Decisions and Conditions",
            material: {
              type: "slide" as const,
              title: "Conditions Slide Deck",
              contentUrl: "https://example.com/lurnkode-demo-conditions.pdf",
              isRagSource: false,
            },
          },
          {
            title: "Loops and Algorithms",
            material: {
              type: "markdown" as const,
              title: "Loops and Algorithms Notes",
              textContent: "# Loops and Algorithms\n\nA loop repeats a block of instructions while a condition holds.\n\n## Practice\nTrace a counter-controlled loop and write down its output.",
              isRagSource: false,
            },
          },
        ],
      },
    ],
  },
  {
    title: "Database Fundamentals",
    description: "A draft course owned by E2E Demo Instructor One.",
    instructorEmail: demoAccounts[0].email,
    status: "draft" as const,
    chapters: [],
  },
  {
    title: "Web Development Fundamentals",
    description: "A published course owned by E2E Demo Instructor Two.",
    instructorEmail: demoAccounts[1].email,
    status: "published" as const,
    chapters: [],
  },
];

interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: "Admin" | "Instructor" | "Learner";
  status?: "active" | "locked";
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
}

interface SeedCredentials {
  email: string;
  password: string;
}

interface BackendCourse {
  id: string;
  instructorId: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  chapters?: BackendChapter[];
}

interface BackendChapter {
  id: string;
  title: string;
  orderIndex: number;
  lessons: BackendLesson[];
}

interface BackendLesson {
  id: string;
  title: string;
  orderIndex: number;
  materials?: BackendMaterial[];
}

interface BackendMaterial {
  id: string;
  title: string;
  type: "markdown" | "video" | "slide";
  contentUrl?: string | null;
  textContent?: string | null;
  isRagSource?: boolean;
}

interface BackendEnrollment {
  courseId: string;
  lastAccessedLessonId: string | null;
  progress?: number;
  completedLessons?: number;
}

interface BackendDiscussion {
  id: string;
  parentId: string | null;
  textContent: string;
  replies?: BackendDiscussion[];
}

interface BackendNotification {
  id: string;
  title: string;
  textMsg: string;
  isRead: boolean;
  createdAt: string;
}

function materialMatches(existing: BackendMaterial, expected: (typeof courseSpecs)[0]["chapters"][number]["lessons"][number]["material"]): boolean {
  if (existing.type !== expected.type || existing.title !== expected.title) return false;
  if (expected.type === "markdown") {
    return existing.textContent === expected.textContent && existing.isRagSource === expected.isRagSource;
  }
  return existing.contentUrl === expected.contentUrl;
}

function assertLocalComposeTarget(): void {
  const context = execFileSync("docker", ["context", "show"], { encoding: "utf8" }).trim();
  if (context !== "desktop-linux") throw new Error("Docker context must be desktop-linux; no seed writes were made.");

  const output = execFileSync("docker", [
    "inspect", "--format", "{{json .Config.Labels}}|{{json .Mounts}}", "lurnkode-postgres",
  ], { encoding: "utf8" }).trim();
  const [labelsText, mountsText] = output.split("|");
  const labels = JSON.parse(labelsText || "{}") as Record<string, string>;
  const mounts = JSON.parse(mountsText || "[]") as Array<{ Type: string; Name?: string; Destination: string }>;
  const composeDirectory = path.resolve(labels["com.docker.compose.project.working_dir"] || "");
  const expectedDirectory = path.resolve(repositoryRoot);
  const localVolumeMounted = mounts.some((mount) =>
    mount.Type === "volume" && mount.Name === "lurnkode_postgres_data" && mount.Destination === "/var/lib/postgresql/data",
  );

  if (
    labels["com.docker.compose.project"] !== "lurnkode" ||
    labels["com.docker.compose.service"] !== "postgres" ||
    composeDirectory.toLowerCase() !== expectedDirectory.toLowerCase() ||
    !localVolumeMounted
  ) {
    throw new Error("PostgreSQL container is not the local lurnkode Compose database for this workspace; no seed writes were made.");
  }
}

function makePassword(): string {
  return `${randomBytes(24).toString("base64url")}aA1!`;
}

function validateDemoCredentialsFile(): void {
  try {
    execFileSync("git", ["check-ignore", "--quiet", credentialsPath], { cwd: repositoryRoot, stdio: "ignore" });
  } catch {
    throw new Error("Credential file path is not Git-ignored; refusing to write local passwords.");
  }
}

async function readOrCreateDemoCredentials(existingTargetAccounts: number): Promise<Map<string, SeedCredentials>> {
  try {
    const fileContents = await readFile(credentialsPath, "utf8");
    const values = new Map<string, string>();
    for (const line of fileContents.split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator > 0) values.set(line.slice(0, separator), line.slice(separator + 1));
    }
    const credentials = new Map<string, SeedCredentials>();
    for (const account of demoAccounts) {
      const email = values.get(`${account.key}_EMAIL`);
      const password = values.get(`${account.key}_PASSWORD`);
      if (email !== account.email || !password || password.length < 12) {
        throw new Error("Local demo credentials file is incomplete or does not match the configured demo accounts.");
      }
      credentials.set(account.email, { email, password });
    }
    return credentials;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  if (existingTargetAccounts > 0) {
    throw new Error("Demo accounts already exist but the ignored credential file is missing; refusing to reset or replace passwords.");
  }

  validateDemoCredentialsFile();

  const credentials = new Map<string, SeedCredentials>();
  const lines = ["# Local-only E2E demo credentials. Do not commit or share outside the project team."];
  for (const account of demoAccounts) {
    const password = makePassword();
    credentials.set(account.email, { email: account.email, password });
    lines.push(`${account.key}_EMAIL=${account.email}`, `${account.key}_PASSWORD=${password}`);
  }
  await writeFile(credentialsPath, `${lines.join("\n")}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return credentials;
}

async function request<T>(
  route: string,
  options: { token?: string; method?: string; body?: unknown; expectedStatus?: number[] } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const expected = options.expectedStatus || [200];
  if (!expected.includes(response.status)) {
    let code = "";
    try {
      const body = await response.json() as ApiEnvelope<unknown>;
      code = body.error?.code ? ` (${body.error.code})` : "";
    } catch { /* response may be empty */ }
    throw new Error(`${options.method || "GET"} ${route} returned HTTP ${response.status}${code}.`);
  }
  if (response.status === 204) return undefined as T;
  const envelope = await response.json() as ApiEnvelope<T>;
  if (!envelope.success) throw new Error(`${options.method || "GET"} ${route} returned an unsuccessful API response.`);
  return envelope.data;
}

async function login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
  const result = await request<{ accessToken: string; user: PublicUser }>("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return { token: result.accessToken, user: result.user };
}

async function listUsers(adminToken: string, email: string): Promise<PublicUser[]> {
  const query = new URLSearchParams({ search: email, page: "1", limit: "100" });
  const result = await request<PublicUser[]>(`/api/v1/users?${query}`, { token: adminToken });
  return result.filter((user) => user.email.toLowerCase() === email.toLowerCase());
}

async function ensureUsers(adminToken: string, credentials: Map<string, SeedCredentials>): Promise<Map<string, PublicUser>> {
  const users = new Map<string, PublicUser>();
  for (const account of demoAccounts) {
    const existing = await listUsers(adminToken, account.email);
    if (existing.length > 1) throw new Error(`Multiple accounts use the demo email ${account.email}; refusing to guess.`);
    if (existing.length === 1) {
      const user = existing[0];
      if (user.role !== account.role || user.status === "locked") {
        throw new Error(`Existing account ${account.email} has an unexpected role or locked status; no role changes were made.`);
      }
      users.set(account.email, user);
      continue;
    }

    const credential = credentials.get(account.email);
    if (!credential) throw new Error(`No local password is available for ${account.email}.`);
    const user = await request<PublicUser>("/api/v1/users", {
      token: adminToken,
      method: "POST",
      body: { email: account.email, fullName: account.fullName, password: credential.password, role: account.role },
      expectedStatus: [201],
    });
    users.set(account.email, user);
    console.log(`Created M1 ${account.role}: ${account.email}`);
  }
  return users;
}

async function getOwnedCourses(token: string): Promise<BackendCourse[]> {
  return request<BackendCourse[]>("/api/v1/my/courses?page=1&limit=100", { token });
}

async function ensureCourse(adminToken: string, ownerToken: string, ownerId: string, spec: typeof courseSpecs[number]): Promise<BackendCourse> {
  const allCourses = await getOwnedCourses(adminToken);
  const titleMatches = allCourses.filter((course) => course.title === spec.title);
  if (titleMatches.length > 1) throw new Error(`Multiple courses are named '${spec.title}'; refusing to duplicate or delete them.`);

  let course = titleMatches[0];
  if (course && (course.instructorId !== ownerId || course.description !== spec.description || course.status !== spec.status)) {
    throw new Error(`Course '${spec.title}' already exists with different owner/content/status; refusing to alter or transfer it.`);
  }
  if (!course) {
    course = await request<BackendCourse>("/api/v1/courses", {
      token: ownerToken,
      method: "POST",
      body: { title: spec.title, description: spec.description },
      expectedStatus: [201],
    });
  }

  for (const [chapterIndex, chapterSpec] of spec.chapters.entries()) {
    let detail = await request<BackendCourse & { chapters: BackendChapter[] }>(`/api/v1/courses/${course.id}`, { token: ownerToken });
    const chapterOrder = chapterIndex + 1;
    let chapter = detail.chapters.find((item) => item.orderIndex === chapterOrder);
    if (!chapter) {
      chapter = await request<BackendChapter>(`/api/v1/courses/${course.id}/chapters`, {
        token: ownerToken,
        method: "POST",
        body: { title: chapterSpec.title, orderIndex: chapterOrder },
        expectedStatus: [201],
      });
    } else if (chapter.title !== chapterSpec.title) {
      throw new Error(`Chapter order ${chapterOrder} in '${spec.title}' has a different title; refusing to overwrite it.`);
    }

    for (const [lessonIndex, lessonSpec] of chapterSpec.lessons.entries()) {
      detail = await request<BackendCourse & { chapters: BackendChapter[] }>(`/api/v1/courses/${course.id}`, { token: ownerToken });
      chapter = detail.chapters.find((item) => item.id === chapter!.id)!;
      const lessonOrder = lessonIndex + 1;
      let lesson = chapter.lessons.find((item) => item.orderIndex === lessonOrder);
      if (!lesson) {
        lesson = await request<BackendLesson>(`/api/v1/chapters/${chapter.id}/lessons`, {
          token: ownerToken,
          method: "POST",
          body: { title: lessonSpec.title, orderIndex: lessonOrder },
          expectedStatus: [201],
        });
      } else if (lesson.title !== lessonSpec.title) {
        throw new Error(`Lesson order ${lessonOrder} in '${chapterSpec.title}' has a different title; refusing to overwrite it.`);
      }

      detail = await request<BackendCourse & { chapters: BackendChapter[] }>(`/api/v1/courses/${course.id}`, { token: ownerToken });
      chapter = detail.chapters.find((item) => item.id === chapter!.id)!;
      lesson = chapter.lessons.find((item) => item.id === lesson!.id)!;
      const materialSpec = lessonSpec.material;
      const existingMaterials = lesson.materials || [];
      const matchingMaterials = existingMaterials.filter((item) => item.title === materialSpec.title);
      if (matchingMaterials.length > 1) throw new Error(`Duplicate material '${materialSpec.title}' in '${lessonSpec.title}'.`);

      if (matchingMaterials.length === 1) {
        if (!materialMatches(matchingMaterials[0], materialSpec)) {
          throw new Error(`Material '${materialSpec.title}' conflicts with an existing material; refusing to overwrite it.`);
        }
      } else {
        await request<BackendMaterial>(`/api/v1/lessons/${lesson.id}/materials`, {
          token: ownerToken,
          method: "POST",
          body: materialSpec,
          expectedStatus: [201],
        });
      }
    }
  }

  const finalStatus = await request<BackendCourse>(`/api/v1/courses/${course.id}`, {
    token: ownerToken,
    method: "PATCH",
    body: { status: spec.status },
  });
  return finalStatus;
}

async function ensureDiscussion(token: string, lessonId: string, textContent: string): Promise<BackendDiscussion> {
  const posts = await request<BackendDiscussion[]>(`/api/v1/lessons/${lessonId}/discussions`, { token });
  const matching = posts.filter((post) => post.textContent === textContent && post.parentId === null);
  if (matching.length > 1) throw new Error("Duplicate E2E seed discussion found; refusing to create another.");
  if (matching.length === 1) return matching[0];
  return request<BackendDiscussion>(`/api/v1/lessons/${lessonId}/discussions`, {
    token,
    method: "POST",
    body: { textContent },
    expectedStatus: [201],
  });
}

async function ensureReply(token: string, lessonId: string, root: BackendDiscussion, textContent: string): Promise<void> {
  const posts = await request<BackendDiscussion[]>(`/api/v1/lessons/${lessonId}/discussions`, { token });
  const currentRoot = posts.find((post) => post.id === root.id);
  const matching = (currentRoot?.replies || []).filter((reply) => reply.textContent === textContent);
  if (matching.length > 1) throw new Error("Duplicate E2E seed reply found; refusing to create another.");
  if (matching.length === 1) return;
  await request<BackendDiscussion>(`/api/v1/lessons/${lessonId}/discussions`, {
    token,
    method: "POST",
    body: { textContent, parentId: root.id },
    expectedStatus: [201],
  });
}

async function ensureNotificationsReadAndUnread(learnerToken: string, instructorToken: string, lessonId: string): Promise<void> {
  const rootTexts = [
    "[E2E-DEMO-SEED] How should I trace a loop?",
    "[E2E-DEMO-SEED] When should I use a condition?",
    "[E2E-DEMO-SEED] What is a useful first debugging step?",
  ];
  let notifications = await request<BackendNotification[]>("/api/v1/notifications", { token: learnerToken });

  for (const [index, rootText] of rootTexts.entries()) {
    if (notifications.some((item) => item.title === "New reply" && item.textMsg === "Someone replied to your discussion." && !item.isRead)) break;
    const root = await ensureDiscussion(learnerToken, lessonId, rootText);
    await ensureReply(instructorToken, lessonId, root, `[E2E-DEMO-SEED] Instructor reply ${index + 1}: inspect one step at a time.`);
    notifications = await request<BackendNotification[]>("/api/v1/notifications", { token: learnerToken });
  }

  const seedNotifications = notifications
    .filter((item) => item.title === "New reply" && item.textMsg === "Someone replied to your discussion.")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (seedNotifications.length < 2) {
    const extraRoot = await ensureDiscussion(learnerToken, lessonId, rootTexts[2]);
    await ensureReply(instructorToken, lessonId, extraRoot, "[E2E-DEMO-SEED] Instructor reply 3: inspect one step at a time.");
    notifications = await request<BackendNotification[]>("/api/v1/notifications", { token: learnerToken });
  }

  const refreshed = notifications
    .filter((item) => item.title === "New reply" && item.textMsg === "Someone replied to your discussion.")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (refreshed.length < 2) throw new Error("Could not create two reply notifications for read/unread demo state.");
  const oldestUnread = refreshed.find((item) => !item.isRead);
  const latestUnread = [...refreshed].reverse().find((item) => !item.isRead);
  if (oldestUnread && latestUnread && oldestUnread.id !== latestUnread.id) {
    await request<BackendNotification>(`/api/v1/notifications/${oldestUnread.id}/read`, {
      token: learnerToken,
      method: "PATCH",
    });
  } else if (!refreshed.some((item) => item.isRead)) {
    await request<BackendNotification>(`/api/v1/notifications/${refreshed[0].id}/read`, {
      token: learnerToken,
      method: "PATCH",
    });
  }

  const finalNotifications = await request<BackendNotification[]>("/api/v1/notifications", { token: learnerToken });
  if (!finalNotifications.some((item) => item.isRead) || !finalNotifications.some((item) => !item.isRead)) {
    throw new Error("Could not establish both read and unread notifications.");
  }
}

async function verifyPasswordHashes(pool: Pool, users: Map<string, PublicUser>, credentials: Map<string, SeedCredentials>): Promise<void> {
  const result = await pool.query<{
    id: string;
    email: string;
    role: string;
    status: string;
    password_hash: string;
    instructor_id: string | null;
    learner_id: string | null;
  }>(
    `SELECT u.id, u.email, u.role, u.status, u.password_hash,
            i.id AS instructor_id, l.id AS learner_id
       FROM users u
       LEFT JOIN instructors i ON i.id = u.id
       LEFT JOIN learners l ON l.id = u.id
      WHERE u.email = ANY($1::varchar[])`,
    [demoAccounts.map((account) => account.email)],
  );

  for (const expected of demoAccounts) {
    const row = result.rows.find((item) => item.email === expected.email);
    const user = users.get(expected.email);
    const credential = credentials.get(expected.email);
    if (!row || !user || !credential || row.id !== user.id || row.role !== expected.role || row.status !== "active") {
      throw new Error(`Database verification failed for ${expected.email}.`);
    }
    if (row.password_hash === credential.password || !row.password_hash.startsWith("$argon2id$")) {
      throw new Error(`M1 password hash verification failed for ${expected.email}.`);
    }
    if (!(await Bun.password.verify(credential.password, row.password_hash))) {
      throw new Error(`M1 password verification failed for ${expected.email}.`);
    }
    if (expected.role === "Instructor" && !row.instructor_id) throw new Error(`Instructor membership was not created for ${expected.email}.`);
    if (expected.role === "Learner" && !row.learner_id) throw new Error(`Learner membership was not created for ${expected.email}.`);
  }
}

async function main(): Promise<void> {
  assertLocalComposeTarget();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    max: 1,
    options: "-c default_transaction_read_only=on",
  });

  try {
    const identity = await pool.query<{ database_name: string }>("SELECT current_database() AS database_name");
    if (identity.rows[0]?.database_name !== databaseTarget.database) {
      throw new Error("Connected database identity did not match the explicitly confirmed local target; no seed writes were made.");
    }

    const existing = await pool.query<{ user_count: number; admin_count: number; target_user_count: number; target_course_count: number }>(
      `SELECT
         (SELECT count(*)::int FROM users) AS user_count,
         (SELECT count(*)::int FROM users WHERE role = 'Admin' AND status = 'active') AS admin_count,
         (SELECT count(*)::int FROM users WHERE email = ANY($1::varchar[])) AS target_user_count,
         (SELECT count(*)::int FROM courses WHERE title = ANY($2::varchar[])) AS target_course_count`,
      [demoAccounts.map((account) => account.email), courseSpecs.map((course) => course.title)],
    );
    const before = existing.rows[0];
    console.log(`Local target verified: ${databaseTarget.database}; DB users=${before.user_count}, active admins=${before.admin_count}, target users=${before.target_user_count}, target courses=${before.target_course_count}.`);

    const health = await fetch(`${API_BASE_URL}/health`);
    if (!health.ok) throw new Error(`Local API health check returned HTTP ${health.status}; no seed writes were made.`);
    if (dryRun) {
      console.log(`Dry run only. ${before.admin_count === 0 ? "No active Admin exists; execution will require an M1 Admin account." : "An active M1 Admin is available."}`);
      return;
    }

    const adminEmail = process.env.DEMO_SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.DEMO_SEED_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) throw new Error("Set DEMO_SEED_ADMIN_EMAIL and DEMO_SEED_ADMIN_PASSWORD to an existing M1 Admin; no seed data was written.");

    let adminSession: { token: string; user: PublicUser };
    try {
      adminSession = await login(adminEmail, adminPassword);
    } catch {
      throw new Error("M1 Admin login failed; no seed data was written.");
    }
    if (adminSession.user.role !== "Admin") throw new Error("The supplied M1 account is not an Admin; no seed data was written.");

    const accountMatches = await Promise.all(demoAccounts.map((account) => listUsers(adminSession.token, account.email)));
    const targetAccountCount = accountMatches.reduce((total, matches) => total + matches.length, 0);
    const credentials = await readOrCreateDemoCredentials(targetAccountCount);
    const users = await ensureUsers(adminSession.token, credentials);

    const sessions = new Map<string, { token: string; user: PublicUser }>();
    for (const account of demoAccounts) {
      const credential = credentials.get(account.email)!;
      const session = await login(credential.email, credential.password);
      if (session.user.id !== users.get(account.email)!.id || session.user.role !== account.role) {
        throw new Error(`M1 login/role verification failed for ${account.email}.`);
      }
      sessions.set(account.email, session);
    }

    const instructorOne = sessions.get(demoAccounts[0].email)!;
    const instructorTwo = sessions.get(demoAccounts[1].email)!;
    const learner = sessions.get(demoAccounts[2].email)!;
    const ownedCourses = new Map<string, BackendCourse>();
    for (const spec of courseSpecs) {
      const owner = spec.instructorEmail === demoAccounts[0].email ? instructorOne : instructorTwo;
      const ownerUser = users.get(spec.instructorEmail)!;
      const course = await ensureCourse(adminSession.token, owner.token, ownerUser.id, spec);
      ownedCourses.set(spec.title, course);
    }

    const programming = ownedCourses.get("Introduction to Programming")!;
    const programmingDetail = await request<BackendCourse & { chapters: BackendChapter[] }>(`/api/v1/courses/${programming.id}`, { token: instructorOne.token });
    const orderedLessons = programmingDetail.chapters
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .flatMap((chapter) => [...chapter.lessons].sort((a, b) => a.orderIndex - b.orderIndex));
    if (programmingDetail.chapters.length !== 2 || orderedLessons.length !== 4 || orderedLessons.some((lesson) => !lesson.materials?.length)) {
      throw new Error("Programming curriculum verification failed; expected 2 chapters, 4 lessons and at least one material per lesson.");
    }

    const learnerEnrollments = await request<BackendEnrollment[]>("/api/v1/my/enrollments", { token: learner.token });
    if (!learnerEnrollments.some((item) => item.courseId === programming.id)) {
      await request(`/api/v1/courses/${programming.id}/enroll`, { token: learner.token, method: "POST", expectedStatus: [201] });
    }

    await ensureDiscussion(learner.token, orderedLessons[0].id, "[E2E-DEMO-SEED] How should I trace a loop?");
    await ensureDiscussion(learner.token, orderedLessons[0].id, "[E2E-DEMO-SEED] When should I use a condition?");
    const discussionRoots = await request<BackendDiscussion[]>(`/api/v1/lessons/${orderedLessons[0].id}/discussions`, { token: learner.token });
    const instructorReplies = [
      "[E2E-DEMO-SEED] Instructor reply 1: inspect one step at a time.",
      "[E2E-DEMO-SEED] Instructor reply 2: inspect one step at a time.",
    ];
    for (const [index, rootText] of ["[E2E-DEMO-SEED] How should I trace a loop?", "[E2E-DEMO-SEED] When should I use a condition?"].entries()) {
      const root = discussionRoots.find((item) => item.textContent === rootText)!;
      await ensureReply(instructorOne.token, orderedLessons[0].id, root, instructorReplies[index]);
    }
    await ensureNotificationsReadAndUnread(learner.token, instructorOne.token, orderedLessons[0].id);

    const enrollmentAfterInteractions = (await request<BackendEnrollment[]>("/api/v1/my/enrollments", { token: learner.token }))
      .find((item) => item.courseId === programming.id)!;
    const firstLessonIndex = orderedLessons.findIndex((lesson) => lesson.id === enrollmentAfterInteractions.lastAccessedLessonId);
    if (firstLessonIndex < 0) await request(`/api/v1/lessons/${orderedLessons[0].id}/complete`, { token: learner.token, method: "POST" });

    const refreshedEnrollments = await request<BackendEnrollment[]>("/api/v1/my/enrollments", { token: learner.token });
    const progressEnrollment = refreshedEnrollments.find((item) => item.courseId === programming.id)!;
    if ((progressEnrollment.completedLessons || 0) < 1 || (progressEnrollment.progress || 0) < 25) {
      throw new Error("Expected demo learner progress to include at least the first of four lessons.");
    }

    const skippedLessonIndex = (progressEnrollment.completedLessons || 0) + 1;
    if (skippedLessonIndex < orderedLessons.length) {
      const sequentialResponse = await fetch(`${API_BASE_URL}/api/v1/lessons/${orderedLessons[skippedLessonIndex].id}/access`, {
        headers: { Authorization: `Bearer ${learner.token}` },
      });
      if (sequentialResponse.status !== 403) throw new Error("Sequential-access verification expected HTTP 403 when skipping an incomplete prerequisite.");
      const sequentialError = await sequentialResponse.json() as { error?: { code?: string } };
      if (sequentialError.error?.code !== "SEQUENTIAL_PREREQUISITE_FAILED") {
        throw new Error("Sequential-access verification returned an unexpected error code.");
      }
    } else {
      console.log("Sequential access: no remaining lesson can be skipped because the demo learner has completed the course.");
    }

    const instructorOneCourses = await getOwnedCourses(instructorOne.token);
    const instructorTwoCourses = await getOwnedCourses(instructorTwo.token);
    const adminCourses = await getOwnedCourses(adminSession.token);
    const publicCourses = await request<BackendCourse[]>("/api/v1/courses?page=1&limit=100");
    const finalEnrollments = await request<BackendEnrollment[]>("/api/v1/my/enrollments", { token: learner.token });

    for (const title of ["Introduction to Programming", "Database Fundamentals"]) {
      if (!instructorOneCourses.some((course) => course.title === title)) throw new Error(`Instructor 1 cannot list owned course '${title}'.`);
    }
    if (!instructorTwoCourses.some((course) => course.title === "Web Development Fundamentals")) {
      throw new Error("Instructor 2 cannot list the owned Web Development course.");
    }
    if (instructorOneCourses.some((course) => course.title === "Web Development Fundamentals")) {
      throw new Error("Instructor 1 received Instructor 2's course.");
    }
    if (!adminCourses.some((course) => course.title === "Database Fundamentals" && course.status === "draft")) {
      throw new Error("Admin course listing did not include the Draft course.");
    }
    if (!publicCourses.some((course) => course.title === "Introduction to Programming") || publicCourses.some((course) => course.title === "Database Fundamentals")) {
      throw new Error("Public catalog does not match the Published/Draft course set.");
    }
    if (!finalEnrollments.some((item) => item.courseId === programming.id)) throw new Error("Learner enrollment is missing.");

    await verifyPasswordHashes(pool, users, credentials);
    const dbVerification = await pool.query<{ chapter_count: number; lesson_count: number; material_count: number; enrollment_count: number; discussion_count: number; notification_read_count: number; notification_unread_count: number; seed_read_count: number; seed_unread_count: number }>(
      `SELECT
         (SELECT count(*)::int FROM chapters WHERE course_id = $1) AS chapter_count,
         (SELECT count(*)::int FROM lessons l JOIN chapters c ON c.id = l.chapter_id WHERE c.course_id = $1) AS lesson_count,
         (SELECT count(*)::int FROM materials m JOIN lessons l ON l.id = m.lesson_id JOIN chapters c ON c.id = l.chapter_id WHERE c.course_id = $1) AS material_count,
         (SELECT count(*)::int FROM enrollments WHERE course_id = $1 AND learner_id = $2) AS enrollment_count,
         (SELECT count(*)::int FROM discussions d JOIN lessons l ON l.id = d.lesson_id JOIN chapters c ON c.id = l.chapter_id WHERE c.course_id = $1 AND d.text_content LIKE '[E2E-DEMO-SEED]%') AS discussion_count,
         (SELECT count(*)::int FROM notifications WHERE user_id = $2 AND is_read = true) AS notification_read_count,
         (SELECT count(*)::int FROM notifications WHERE user_id = $2 AND is_read = false) AS notification_unread_count,
         (SELECT count(*)::int FROM notifications WHERE user_id = $2 AND title = 'New reply' AND text_msg = 'Someone replied to your discussion.' AND is_read = true) AS seed_read_count,
         (SELECT count(*)::int FROM notifications WHERE user_id = $2 AND title = 'New reply' AND text_msg = 'Someone replied to your discussion.' AND is_read = false) AS seed_unread_count`,
      [programming.id, learner.user.id],
    );
    const counts = dbVerification.rows[0];
    if (counts.chapter_count !== 2 || counts.lesson_count !== 4 || counts.material_count < 4 || counts.enrollment_count !== 1 || counts.discussion_count < 4 || counts.seed_read_count < 1 || counts.seed_unread_count < 1) {
      throw new Error("Final read-only database verification failed for the E2E demo records.");
    }

    console.log("E2E demo seed completed and verified.");
    console.log(`Credentials file: ${path.relative(repositoryRoot, credentialsPath)} (Git-ignored; passwords are not printed).`);
    console.log("Users: 2 Instructor, 1 Learner; accounts created through M1 Admin API.");
    console.log("Courses: Introduction to Programming (Published, 2 chapters / 4 lessons), Database Fundamentals (Draft), Web Development Fundamentals (Published).");
    console.log(`Database evidence: chapters=${counts.chapter_count}, lessons=${counts.lesson_count}, materials=${counts.material_count}, enrollment=${counts.enrollment_count}, discussions=${counts.discussion_count}, read notifications=${counts.notification_read_count}, unread notifications=${counts.notification_unread_count}.`);
    console.log(`Learning state: ${progressEnrollment.completedLessons}/4 lessons complete (${progressEnrollment.progress}%); sequential access correctly blocks skipping the next lesson with SEQUENTIAL_PREREQUISITE_FAILED.`);
    console.log("Instructor ownership, Draft visibility, public Published catalog, learner enrollment and M1 Argon2id password verification all passed.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo seed failed; no secrets were printed.");
  process.exitCode = 1;
});
