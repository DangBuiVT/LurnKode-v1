"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "Instructor" || user?.role === "Admin") {
      router.replace("/studio/courses");
    } else {
      router.replace("/course/catalog");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
      Redirecting to your workspace...
    </div>
  );
}
