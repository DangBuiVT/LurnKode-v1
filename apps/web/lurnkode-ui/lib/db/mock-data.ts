import {
  User,
  Course,
  Chapter,
  Lesson,
  Material,
  Enrollment,
} from "./schema";

// 1. Users Mock Dataset
export const MOCK_USERS: User[] = [
  {
    id: "u-inst-01",
    name: "John Doe",
    email: "john.doe@lurnkode.edu",
    role: "instructor",
    created_at: "2026-01-10T08:00:00Z",
  },
  {
    id: "u-inst-02",
    name: "Jane Smith",
    email: "jane.smith@lurnkode.edu",
    role: "instructor",
    created_at: "2026-01-15T09:30:00Z",
  },
  {
    id: "u-inst-03",
    name: "Alex Rivera",
    email: "alex.rivera@lurnkode.edu",
    role: "instructor",
    created_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "u-learn-01",
    name: "John",
    email: "john.learner@lurnkode.edu",
    role: "learner",
    created_at: "2026-02-01T14:20:00Z",
  },
];

// Current logged-in user in mock environment
export const CURRENT_USER: User = MOCK_USERS[3]; // Learner John

// 2. Courses Mock Dataset
export const MOCK_COURSES: Course[] = [
  {
    id: "c-dsa",
    instructor_id: "u-inst-01",
    title: "Data Structures & Algorithms",
    description: "Master fundamental data structures, algorithms, and complexity analysis for technical interviews.",
    status: "published",
    category: "Computer Science",
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "c-python",
    instructor_id: "u-inst-01",
    title: "Introduction to Python",
    description: "Build a solid foundation in Python programming, syntax, data structures, and script writing.",
    status: "published",
    category: "Programming",
    created_at: "2026-09-05T11:00:00Z",
  },
  {
    id: "c-web-dev",
    instructor_id: "u-inst-02",
    title: "Web Development Fundamentals",
    description: "Learn modern HTML, CSS, JavaScript, and responsive design principles to build web applications.",
    status: "published",
    category: "Web Development",
    created_at: "2026-09-10T14:00:00Z",
  },
  {
    id: "c-ai-ml",
    instructor_id: "u-inst-01",
    title: "AI & Machine Learning",
    description: "Explore core concepts of artificial intelligence, supervised learning, and neural network models.",
    status: "published",
    category: "Artificial Intelligence",
    created_at: "2026-09-15T09:00:00Z",
  },
  {
    id: "c-db-systems",
    instructor_id: "u-inst-02",
    title: "Database Systems",
    description: "Understand relational database management, SQL schema design, normalization, and optimization.",
    status: "published",
    category: "Data & Systems",
    created_at: "2026-09-20T16:00:00Z",
  },
  {
    id: "c-se",
    instructor_id: "u-inst-02",
    title: "Software Engineering",
    description: "Study software lifecycle methodologies, system architecture, testing standards, and clean code.",
    status: "published",
    category: "Software Engineering",
    created_at: "2026-09-25T13:00:00Z",
  },
  {
    id: "c-cloud-devops",
    instructor_id: "u-inst-03",
    title: "Cloud Infrastructure & DevOps",
    description: "Automate delivery pipelines with Docker, Kubernetes, CI/CD, and AWS architecture essentials.",
    status: "published",
    category: "Cloud & DevOps",
    created_at: "2026-09-28T10:00:00Z",
  },
  {
    id: "c-react-next",
    instructor_id: "u-inst-01",
    title: "Modern React & Next.js Ecosystem",
    description: "Deep dive into React 19, Server Components, Next.js App Router, and scalable UI architectures.",
    status: "published",
    category: "Web Development",
    created_at: "2026-10-02T15:30:00Z",
  },
  {
    id: "c-cyber-sec",
    instructor_id: "u-inst-03",
    title: "Cybersecurity & Network Defense",
    description: "Practical security concepts covering cryptography, web vulnerability assessment, and threat mitigation.",
    status: "published",
    category: "Security",
    created_at: "2026-10-06T08:45:00Z",
  },
  {
    id: "c-mobile-flutter",
    instructor_id: "u-inst-02",
    title: "Cross-Platform Mobile with Flutter",
    description: "Build natively compiled Android and iOS applications with Dart and Flutter reactive UI.",
    status: "published",
    category: "Mobile",
    created_at: "2026-10-10T12:00:00Z",
  },
  {
    id: "c-system-design",
    instructor_id: "u-inst-01",
    title: "Distributed Systems & Scalability",
    description: "Design fault-tolerant distributed services, caching strategies, messaging queues, and sharding.",
    status: "published",
    category: "Architecture",
    created_at: "2026-10-14T09:15:00Z",
  },
  {
    id: "c-ui-ux",
    instructor_id: "u-inst-03",
    title: "Design Systems & UI/UX Principles",
    description: "Design intuitive interfaces, typography hierarchies, component design tokens, and user journeys.",
    status: "published",
    category: "Design",
    created_at: "2026-10-16T14:20:00Z",
  },
  // Studio Draft Courses (John Doe - u-inst-01)
  {
    id: "c-draft-01",
    instructor_id: "u-inst-01",
    title: "Introduction to Programming",
    description: "Introductory course for beginners covering basic syntax, logic, variables, and control flow.",
    status: "draft",
    category: "Programming",
    created_at: "2026-10-18T10:00:00Z",
  },
  {
    id: "c-draft-02",
    instructor_id: "u-inst-01",
    title: "Introduction to Programming (Advanced)",
    description: "Comprehensive follow-up course exploring OOP, modular design patterns, unit testing, and memory.",
    status: "draft",
    category: "Programming",
    created_at: "2026-10-20T11:30:00Z",
  },
  {
    id: "c-draft-03",
    instructor_id: "u-inst-01",
    title: "Rust Systems Programming & Memory Safety",
    description: "Learn ownership, borrowing, lifetimes, and zero-cost abstractions for performant systems programming.",
    status: "draft",
    category: "Computer Science",
    created_at: "2026-10-22T09:00:00Z",
  },
  {
    id: "c-draft-04",
    instructor_id: "u-inst-01",
    title: "Microservices Architecture with gRPC",
    description: "Inter-service communication, Protobuf serialization, and service meshes in distributed microservices.",
    status: "draft",
    category: "Architecture",
    created_at: "2026-10-24T16:00:00Z",
  },
  // Studio Archived Courses (John Doe - u-inst-01)
  {
    id: "c-arch-01",
    instructor_id: "u-inst-01",
    title: "Legacy Web Development (PHP 7 & jQuery)",
    description: "Archived curriculum for monolithic web applications with legacy stack tooling.",
    status: "archived",
    category: "Web Development",
    created_at: "2025-06-15T08:00:00Z",
  },
  {
    id: "c-arch-02",
    instructor_id: "u-inst-01",
    title: "High Performance Computing with C++11",
    description: "Superseded curriculum covering multithreading and low-level parallel programming paradigms.",
    status: "archived",
    category: "Computer Science",
    created_at: "2025-08-20T14:00:00Z",
  },
];

// 3. Chapters Mock Dataset
export const MOCK_CHAPTERS: Chapter[] = [
  // Chapters for c-dsa
  {
    id: "chap-dsa-1",
    course_id: "c-dsa",
    title: "Basic Search Concepts",
    order_index: 1,
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "chap-dsa-2",
    course_id: "c-dsa",
    title: "Binary Search Tree (BST)",
    order_index: 2,
    created_at: "2026-10-05T09:00:00Z",
  },
  {
    id: "chap-dsa-3",
    course_id: "c-dsa",
    title: "Advanced Graphs & Dynamic Programming",
    order_index: 3,
    created_at: "2026-10-10T10:00:00Z",
  },
  // Chapters for c-db-systems
  {
    id: "chap-db-1",
    course_id: "c-db-systems",
    title: "Relational Modeling & Normalization",
    order_index: 1,
    created_at: "2026-10-02T10:00:00Z",
  },
  // Chapters for c-python
  {
    id: "chap-py-1",
    course_id: "c-python",
    title: "Python Fundamentals & Syntax",
    order_index: 1,
    created_at: "2026-09-06T09:00:00Z",
  },
];

// 4. Lessons Mock Dataset (Sequential Learning by order_index)
export const MOCK_LESSONS: Lesson[] = [
  // Lessons for chap-dsa-1
  {
    id: "les-dsa-1-1",
    chapter_id: "chap-dsa-1",
    title: "Introduction to Binary Search",
    order_index: 1,
    created_at: "2026-10-01T08:30:00Z",
  },
  {
    id: "les-dsa-1-2",
    chapter_id: "chap-dsa-1",
    title: "Search on Sorted Arrays",
    order_index: 2,
    created_at: "2026-10-01T09:00:00Z",
  },
  {
    id: "les-dsa-1-3",
    chapter_id: "chap-dsa-1",
    title: "Introduction to Tree Data Structures",
    order_index: 3,
    created_at: "2026-10-01T09:30:00Z",
  },

  // Lessons for chap-dsa-2
  {
    id: "les-dsa-2-1",
    chapter_id: "chap-dsa-2",
    title: "BST Node & Properties",
    order_index: 1,
    created_at: "2026-10-05T09:30:00Z",
  },
  {
    id: "les-dsa-2-2",
    chapter_id: "chap-dsa-2",
    title: "BST Insertion & In-Order Traversal",
    order_index: 2,
    created_at: "2026-10-05T10:00:00Z",
  },

  // Lessons for chap-dsa-3
  {
    id: "les-dsa-3-1",
    chapter_id: "chap-dsa-3",
    title: "Graph Representation & BFS/DFS",
    order_index: 1,
    created_at: "2026-10-10T10:30:00Z",
  },

  // Lessons for chap-db-1
  {
    id: "les-db-1-1",
    chapter_id: "chap-db-1",
    title: "ER Diagrams & Relational Constraints",
    order_index: 1,
    created_at: "2026-10-02T10:30:00Z",
  },

  // Lessons for chap-py-1
  {
    id: "les-py-1-1",
    chapter_id: "chap-py-1",
    title: "Python Syntax & Primitive Data Types",
    order_index: 1,
    created_at: "2026-09-06T09:30:00Z",
  },
  {
    id: "les-py-1-2",
    chapter_id: "chap-py-1",
    title: "Functions, Scope, and Data Structures",
    order_index: 2,
    created_at: "2026-09-06T10:00:00Z",
  },
];

// 5. Materials Mock Dataset (with is_rag_source for M4 AI Tutor)
export const MOCK_MATERIALS: Material[] = [
  // Materials for les-dsa-1-1
  {
    id: "mat-dsa-1-1-v",
    lesson_id: "les-dsa-1-1",
    type: "video",
    title: "Binary Search Visual Explanation",
    content: "https://videos.lurnkode.edu/dsa/binary-search-intro.mp4",
    is_rag_source: false,
    created_at: "2026-10-01T08:35:00Z",
  },
  {
    id: "mat-dsa-1-1-m",
    lesson_id: "les-dsa-1-1",
    type: "markdown",
    title: "Binary Search Algorithm Notes & Complexity",
    content: `# Binary Search Algorithm

Binary Search is an efficient algorithm for finding an item from a sorted list of items.

## Invariant
- The search interval is repeatedly halved.
- Time Complexity: $O(\\log n)$
- Space Complexity: $O(1)$ iterative, $O(\\log n)$ recursive call stack.`,
    is_rag_source: true, // RAG source flagged for M4 AI Tutor vector embedding
    created_at: "2026-10-01T08:40:00Z",
  },

  // Materials for les-dsa-1-2
  {
    id: "mat-dsa-1-2-v",
    lesson_id: "les-dsa-1-2",
    type: "video",
    title: "Searching in Sorted and Rotated Arrays",
    content: "https://videos.lurnkode.edu/dsa/sorted-arrays.mp4",
    is_rag_source: false,
    created_at: "2026-10-01T09:05:00Z",
  },
  {
    id: "mat-dsa-1-2-m",
    lesson_id: "les-dsa-1-2",
    type: "markdown",
    title: "Two-Pointer Binary Search Variations",
    content: `# Two-Pointer Binary Search Variations

When searching on sorted arrays with duplicates or rotated pivots:
- Lower bound vs Upper bound
- Pivot finding condition: \`arr[mid] > arr[right]\``,
    is_rag_source: true, // RAG source
    created_at: "2026-10-01T09:10:00Z",
  },

  // Materials for les-dsa-1-3
  {
    id: "mat-dsa-1-3-v",
    lesson_id: "les-dsa-1-3",
    type: "video",
    title: "Hierarchical Structures & Trees",
    content: "https://videos.lurnkode.edu/dsa/tree-structures.mp4",
    is_rag_source: false,
    created_at: "2026-10-01T09:35:00Z",
  },
  {
    id: "mat-dsa-1-3-s",
    lesson_id: "les-dsa-1-3",
    type: "slide",
    title: "Tree Terminologies & Taxonomy",
    content: "https://slides.lurnkode.edu/dsa/trees.pdf",
    is_rag_source: false,
    created_at: "2026-10-01T09:40:00Z",
  },

  // Materials for les-dsa-2-1
  {
    id: "mat-dsa-2-1-v",
    lesson_id: "les-dsa-2-1",
    type: "video",
    title: "Binary Search Tree Properties",
    content: "https://videos.lurnkode.edu/dsa/bst-properties.mp4",
    is_rag_source: false,
    created_at: "2026-10-05T09:35:00Z",
  },
  {
    id: "mat-dsa-2-1-m",
    lesson_id: "les-dsa-2-1",
    type: "markdown",
    title: "BST Definition and Invariant Rules",
    content: `# Binary Search Tree Invariant

For every node $X$:
- Keys in left subtree $< Key(X)$
- Keys in right subtree $> Key(X)$`,
    is_rag_source: true, // RAG source
    created_at: "2026-10-05T09:40:00Z",
  },
];

// 6. Enrollments Mock Dataset
export const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "enr-01",
    learner_id: "u-learn-01",
    course_id: "c-dsa",
    last_accessed_lesson_id: "les-dsa-1-2", // Learner is currently at Lesson 2
    last_accessed_at: "2026-10-28T14:30:00Z", // Most recent access
    completed_lesson_ids: ["les-dsa-1-1"], // Lesson 1 completed, Lesson 2 unlocked/active, Lesson 3 locked
    created_at: "2026-10-02T15:00:00Z",
  },
  {
    id: "enr-02",
    learner_id: "u-learn-01",
    course_id: "c-db-systems",
    last_accessed_lesson_id: "les-db-1-1",
    last_accessed_at: "2026-10-26T09:15:00Z",
    completed_lesson_ids: [],
    created_at: "2026-10-15T08:30:00Z",
  },
  {
    id: "enr-03",
    learner_id: "u-learn-01",
    course_id: "c-python",
    last_accessed_lesson_id: "les-py-1-2",
    last_accessed_at: "2026-09-12T16:00:00Z",
    completed_lesson_ids: ["les-py-1-1", "les-py-1-2"], // 100% completed
    created_at: "2026-09-08T11:00:00Z",
  },
];
