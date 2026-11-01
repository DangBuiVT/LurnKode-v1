"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { interactionsApi } from "@/lib/api/interactions";
import { useAuth } from "@/lib/auth-context";
import type { BackendNotification } from "@/lib/api/types";

export function NotificationBell() {
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<BackendNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  const refresh = async () => {
    try {
      setItems(await interactionsApi.getNotifications());
      setError(false);
    } catch {
      setItems([]);
      setError(true);
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      const timer = setTimeout(() => void refresh(), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setItems([]), 0);
    return () => clearTimeout(timer);
  }, [isLoading, user]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />}
        <span className="sr-only">Notifications</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button type="button" className="text-xs text-primary" onClick={() => void refresh()}>Refresh</button>
          </div>
          {error ? <p role="alert" className="py-4 text-sm text-destructive">Notifications could not be loaded.</p> : items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No notifications.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className={`rounded-lg p-2 text-sm ${item.isRead ? "bg-muted/30" : "bg-primary/5"}`}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.textMsg}</p>
                  {!item.isRead && <button type="button" className="mt-1 text-xs text-primary" onClick={async () => {
                    try {
                      const updated = await interactionsApi.markNotificationRead(item.id);
                      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
                    } catch { setError(true); }
                  }}>Mark as read</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
