"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder, BookOpen } from "lucide-react";
import { cn } from "cn";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Course", href: "/course/catalog", icon: Folder },
  { name: "Learn", href: "/learn", icon: BookOpen },
  // Temporarily commented out Progress nav item
  // { name: "Progress", href: "/progress", icon: BarChart2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) => {
    if (item.name === "Learn") {
      e.preventDefault();

      if (!isAuthenticated) {
        router.push("/auth/login?redirect=/learn");
        return;
      }

      if (user?.role === "Instructor" || user?.role === "Admin") {
        router.push("/studio/courses");
        return;
      }

      // If already on /learn/[courseId]/[lessonId], no need to re-navigate
      if (pathname && pathname.startsWith("/learn/")) {
        return;
      }

      router.push("/learn");
    }
  };

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isLearn = item.href === "/learn";
          const isCourse = item.href === "/course/catalog";

          let isActive = false;
          if (isLearn) {
            isActive = Boolean(pathname?.startsWith("/learn"));
          } else if (isCourse) {
            isActive = Boolean(
              pathname?.startsWith("/course") && !pathname?.startsWith("/learn")
            );
          } else {
            isActive = pathname === item.href;
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-semibold dark:bg-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
