import { describe, expect, it } from "bun:test";
import {
  getDefaultRouteForRole,
  getSafeRedirectTarget,
  isPublicAuthRoute,
} from "./auth-routing";

describe("auth routing", () => {
  it("uses the existing home route for each internal role", () => {
    expect(getDefaultRouteForRole("Learner")).toBe("/course/catalog");
    expect(getDefaultRouteForRole("Instructor")).toBe("/studio/courses");
    expect(getDefaultRouteForRole("Admin")).toBe("/studio/courses");
  });

  it("allows only local application paths as post-login targets", () => {
    expect(getSafeRedirectTarget("/learn/course-1/lesson-1")).toBe(
      "/learn/course-1/lesson-1",
    );
    expect(getSafeRedirectTarget("/course/catalog?page=2#results")).toBe(
      "/course/catalog?page=2#results",
    );
    expect(getSafeRedirectTarget("/studio/courses", "Learner")).toBeNull();
    expect(getSafeRedirectTarget("//evil.example/path")).toBeNull();
    expect(getSafeRedirectTarget("https://evil.example/path")).toBeNull();
    expect(getSafeRedirectTarget("/auth/login")).toBeNull();
  });

  it("marks only authentication screens as public", () => {
    expect(isPublicAuthRoute("/auth/login")).toBe(true);
    expect(isPublicAuthRoute("/auth/register")).toBe(true);
    expect(isPublicAuthRoute("/login")).toBe(true);
    expect(isPublicAuthRoute("/course/catalog")).toBe(false);
    expect(isPublicAuthRoute("/studio/courses")).toBe(false);
  });
});
