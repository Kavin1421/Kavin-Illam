"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";

import {
  extractProjectSlug,
  isNavActive,
  projectNavItems,
} from "@/components/layout/nav-config";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/auth/sign-out";

export function AppHeader({
  user,
  onOpenMobileNav,
}: {
  user: { name?: string | null; email?: string | null };
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const slug = extractProjectSlug(pathname);
  const crumbs = buildBreadcrumbs(pathname, slug);
  const initials = (
    user.name?.trim()?.[0] ??
    user.email?.trim()?.[0] ??
    "K"
  ).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-[var(--ki-header-height)] items-center gap-2 border-b border-white/[0.06] bg-[rgba(6,63,58,0.42)] px-3 backdrop-blur-xl sm:gap-3 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-lg text-white/80 transition-ki-fast hover:bg-white/[0.06] hover:text-white lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => (
            <li
              key={`${index}-${crumb.label}-${crumb.href}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 ? (
                <span className="shrink-0 text-white/25">/</span>
              ) : null}
              {index === crumbs.length - 1 ? (
                <span className="truncate font-medium text-white">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted-white/80 transition-ki-fast hover:text-white"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="hidden items-center md:flex">
        <button
          type="button"
          className="flex h-10 w-[22rem] max-w-[min(100%,26.875rem)] items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-left text-sm text-muted-white transition-ki-fast hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:border-cta/50 focus-visible:ring-[3px] focus-visible:ring-[rgba(0,208,132,0.22)] focus-visible:outline-none disabled:opacity-70 lg:w-[26rem]"
          aria-label="Search (coming soon)"
          disabled
          title="Command palette arrives in a later phase"
        >
          <Search className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">
            Search transactions, documents, tasks…
          </span>
          <kbd className="hidden rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-white lg:inline">
            ⌘K
          </kbd>
        </button>
      </div>

      <button
        type="button"
        className="inline-flex size-10 items-center justify-center rounded-lg text-muted-white transition-ki-fast hover:bg-white/[0.06] hover:text-white disabled:opacity-60 md:hidden"
        aria-label="Search (coming soon)"
        disabled
        title="Search arrives in a later phase"
      >
        <Search className="size-4" />
      </button>

      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted-white transition-ki-fast hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
        aria-label="Notifications"
        disabled
        title="Notification center arrives later"
      >
        <Bell className="size-4" />
      </button>

      <details className="relative">
        <summary
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "cursor-pointer list-none gap-2 px-1.5 sm:px-2",
          )}
        >
          <span className="gradient-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold shadow-[0_0_16px_rgba(0,208,132,0.25)]">
            {initials}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-[8rem] truncate text-sm font-medium text-white">
              {user.name ?? "Account"}
            </span>
            <span className="block text-[11px] text-muted-white">
              {user.email ?? "Signed in"}
            </span>
          </span>
        </summary>
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--ki-surface)_92%,black)] p-1 shadow-ki-lg backdrop-blur-xl">
          <Link
            href="/profile"
            className="block rounded-lg px-3 py-2 text-sm text-white/90 transition-ki-fast hover:bg-white/[0.06]"
          >
            Profile
          </Link>
          <Link
            href="/projects"
            className="block rounded-lg px-3 py-2 text-sm text-white/90 transition-ki-fast hover:bg-white/[0.06]"
          >
            Projects
          </Link>
          {slug ? (
            <Link
              href={`/p/${slug}/settings`}
              className="block rounded-lg px-3 py-2 text-sm text-white/90 transition-ki-fast hover:bg-white/[0.06]"
            >
              Project settings
            </Link>
          ) : null}
          <div className="my-1 border-t border-white/10" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition-ki-fast hover:bg-white/[0.06]"
            >
              Sign out
            </button>
          </form>
        </div>
      </details>
    </header>
  );
}

function buildBreadcrumbs(pathname: string, slug: string | null) {
  if (!slug) {
    if (pathname.startsWith("/profile")) {
      return [
        { href: "/projects", label: "Workspace" },
        { href: "/profile", label: "Profile" },
      ];
    }
    if (pathname.startsWith("/projects/new")) {
      return [
        { href: "/projects", label: "Projects" },
        { href: "/projects/new", label: "New project" },
      ];
    }
    return [{ href: "/projects", label: "Projects" }];
  }

  const items = projectNavItems(slug);
  const active =
    items.find((item) => isNavActive(pathname, item.href, item.exact)) ??
    items[0];
  const projectHome = `/p/${slug}`;

  // Dashboard shares the project root href — avoid duplicate crumbs/keys.
  if (active.href === projectHome) {
    return [
      { href: "/projects", label: "Projects" },
      { href: projectHome, label: active.label },
    ];
  }

  return [
    { href: projectHome, label: "Project" },
    { href: active.href, label: active.label },
  ];
}
