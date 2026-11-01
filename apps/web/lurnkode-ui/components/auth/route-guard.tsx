"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getDefaultRouteForRole,
  getSafeRedirectTarget,
  isPublicAuthRoute,
} from "@/lib/auth-routing";

function RouteGuardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const isRoot = pathname === "/";
  const isPublic = isPublicAuthRoute(pathname);
  const isInstructorRoute = pathname === "/studio" || pathname.startsWith("/studio/");
  const mustRedirect =
    !isLoading &&
    ((!user && (isRoot || !isPublic)) ||
      (Boolean(user) && (isRoot || isPublic)) ||
      (user?.role === "Learner" && isInstructorRoute));

  useEffect(() => {
    if (isLoading) return;

    if (!user && (isRoot || !isPublic)) {
      const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const returnTo = getSafeRedirectTarget(requestedPath);
      router.replace(
        returnTo
          ? `/auth/login?redirect=${encodeURIComponent(returnTo)}`
          : "/auth/login",
      );
      return;
    }

    if (user?.role === "Learner" && isInstructorRoute) {
      router.replace("/course/catalog");
      return;
    }

    if (user && (isRoot || isPublic)) {
      const requestedTarget = isRoot
        ? null
        : new URLSearchParams(window.location.search).get("redirect");
      const returnTo = getSafeRedirectTarget(requestedTarget, user.role);
      router.replace(returnTo ?? getDefaultRouteForRole(user.role));
    }
  }, [isInstructorRoute, isLoading, isPublic, isRoot, router, user]);

  if (isLoading || mustRedirect) {
    return <AuthLoadingFallback />;
  }

  return children;
}

function AuthLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Checking your session…
    </div>
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <RouteGuardContent>{children}</RouteGuardContent>
    </Suspense>
  );
}
