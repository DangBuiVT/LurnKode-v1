import { StudioCourse, StudioCourseStatus } from "@/types/studio";
import { mockDb } from "@/lib/db";

const ENROLLED_MAP: Record<string, number> = {
  "c-dsa": 348,
  "c-python": 412,
  "c-ai-ml": 215,
  "c-react-next": 164,
  "c-system-design": 98,
  "c-arch-01": 52,
  "c-arch-02": 37,
};

const UPDATED_MAP: Record<string, string> = {
  "c-react-next": "Just now",
  "c-draft-04": "1 hour ago",
  "c-draft-03": "Yesterday",
  "c-draft-02": "3 days ago",
  "c-draft-01": "5 days ago",
  "c-system-design": "1 week ago",
  "c-ai-ml": "2 weeks ago",
  "c-python": "3 weeks ago",
  "c-dsa": "1 month ago",
  "c-arch-02": "3 months ago",
  "c-arch-01": "6 months ago",
};

// Expose instructor courses from the database
export function getStudioCourses(): StudioCourse[] {
  return mockDb
    .getCourses({ instructor_id: "u-inst-01" })
    .map((course) => {
      let status: StudioCourseStatus = "Draft";
      if (course.status === "published") status = "Published";
      else if (course.status === "archived") status = "Archived";

      const enrolledCount =
        course.status === "published" || course.status === "archived"
          ? ENROLLED_MAP[course.id] || 45
          : 0;

      return {
        id: course.id,
        title: course.title,
        description: course.description || "",
        status,
        enrolledCount,
        updatedAt: UPDATED_MAP[course.id] || "Recently",
        category: course.category || "General",
        createdAt: course.created_at,
      };
    });
}

export const STUDIO_COURSES: StudioCourse[] = getStudioCourses();
