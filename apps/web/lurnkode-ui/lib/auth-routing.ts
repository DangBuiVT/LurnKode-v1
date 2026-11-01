import type { UserRole } from "./api/types";

export function getDefaultRouteForRole(role: UserRole): string {
  return role === "Learner" ? "/course/catalog" : "/studio/courses";
}

export function isPublicAuthRoute(pathname: string): boolean {
  return ["/auth/login", "/auth/register", "/login", "/register"].includes(
    pathname,
  );
}

export function getSafeRedirectTarget(
  value: string | null | undefined,
  role?: UserRole,
): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return null;
  }

  try {
    const target = new URL(value, "http://lurnkode.local");
    if (target.origin !== "http://lurnkode.local" || target.pathname === "/") {
      return null;
    }
    if (isPublicAuthRoute(target.pathname)) return null;
    if (role === "Learner" && target.pathname.startsWith("/studio")) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
