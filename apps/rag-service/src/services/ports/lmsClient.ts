import type { MaterialSource } from "../../domain/material.ts";

export interface IdentityVerifier {
  verifyBearer(token: string): Promise<{ learnerId: string } | null>;
}
export interface CourseAccessClient {
  canAskCourse(learnerId: string, courseId: string): Promise<boolean>;
}
export interface MaterialClient {
  getMaterial(materialId: string): Promise<MaterialSource | null>;
}
