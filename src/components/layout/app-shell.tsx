"use client";

import {
  useEffect,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { ShellProject } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "ki.sidebar.collapsed";
const COLLAPSE_EVENT = "ki-sidebar-collapse";

function subscribeCollapse(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(COLLAPSE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(COLLAPSE_EVENT, onStoreChange);
  };
}

function getCollapseSnapshot() {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapseServerSnapshot() {
  return false;
}

export function AppShellFrame({
  children,
  user,
  projects,
}: {
  children: ReactNode;
  user: { name?: string | null; email?: string | null };
  projects: ShellProject[];
}) {
  const collapsed = useSyncExternalStore(
    subscribeCollapse,
    getCollapseSnapshot,
    getCollapseServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      window.dispatchEvent(new Event(COLLAPSE_EVENT));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar
        projects={projects}
        user={user}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main
          className={cn(
            "animate-page-in flex-1 overflow-x-hidden",
            "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto w-full max-w-[var(--ki-content-max)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
