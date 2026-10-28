"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, ClipboardList, Inbox } from "lucide-react";
import { cn } from "cn";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: "Courses", href: "/studio/courses", icon: Folder },
  { name: "Assignments", href: "/studio/assignments", icon: ClipboardList },
  { name: "Submissions", href: "/studio/submissions", icon: Inbox },
];

export function StudioSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4 min-h-[calc(100vh-4rem)]">
      <nav className="flex flex-col gap-1.5" aria-label="Studio Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/studio/courses" &&
              (pathname === "/studio" || pathname?.startsWith("/studio/courses")));

          return (
            <Link
              key={item.name}
              href={item.href}
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
