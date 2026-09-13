"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";

import {
  extractProjectSlug,
  globalNavGroups,
  isNavActive,
  projectNavGroups,
  type ShellNavItem,
  type ShellProject,
} from "@/components/layout/nav-config";
import { SidebarProjectSwitcher } from "@/components/layout/project-switcher";
import { cn } from "@/lib/utils";

export type { ShellProject };

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: ShellNavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = isNavActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-[2.75rem] items-center gap-3 rounded-[0.7rem] px-3 py-2.5 text-sm transition-ki-fast",
        "focus-visible:ring-2 focus-visible:ring-mint/40 focus-visible:outline-none",
        collapsed && "justify-center px-2",
        active
          ? "bg-[image:var(--ki-gradient-nav-active)] text-white shadow-[0_0_20px_rgba(0,208,132,0.08)]"
          : "text-sidebar-foreground/75 hover:bg-white/[0.045] hover:text-white",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-cta"
        />
      ) : null}
      <Icon
        className={cn(
          "size-[1.125rem] shrink-0 transition-ki-fast",
          active
            ? "text-cta"
            : "opacity-80 group-hover:translate-x-px group-hover:opacity-100",
        )}
      />
      {!collapsed ? (
        <span className={cn("truncate", active && "font-medium")}>
          {item.label}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarUserCard({
  user,
  role,
  projectStatus,
  collapsed,
}: {
  user: { name?: string | null; email?: string | null };
  role?: string | null;
  projectStatus?: string | null;
  collapsed?: boolean;
}) {
  const initials = (
    user.name?.trim()?.[0] ??
    user.email?.trim()?.[0] ??
    "K"
  ).toUpperCase();
  const label = user.name?.trim() || user.email || "Account";
  const roleLabel = role
    ? role.charAt(0) + role.slice(1).toLowerCase()
    : "Signed in";

  if (collapsed) {
    return (
      <div
        className="mx-auto flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]"
        title={`${label} · ${roleLabel}`}
      >
        <span className="relative">
          <span className="gradient-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            {initials}
          </span>
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[rgba(3,40,37,0.95)] bg-cta"
          />
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-2.5 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <span className="relative shrink-0">
          <span className="gradient-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-xs font-semibold shadow-[0_0_16px_rgba(0,208,132,0.2)]">
            {initials}
          </span>
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[rgba(3,40,37,0.95)] bg-cta"
            title="Online"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{label}</p>
          <p className="truncate text-[11px] text-muted-white">{roleLabel}</p>
        </div>
        {projectStatus ? (
          <span className="shrink-0 rounded-full border border-cta/30 bg-cta/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-mint uppercase">
            {projectStatus}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AppSidebar({
  projects,
  user,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  projects: ShellProject[];
  user: { name?: string | null; email?: string | null };
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const slug = extractProjectSlug(pathname);
  const groups = slug ? projectNavGroups(slug) : globalNavGroups;
  const current = projects.find((project) => project.slug === slug) ?? null;

  const body = (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-5",
          collapsed && "justify-center px-2",
        )}
      >
        <Link
          href={slug ? `/p/${slug}` : "/projects"}
          onClick={onCloseMobile}
          className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-mint/40 focus-visible:outline-none"
        >
          <span className="gradient-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg shadow-[0_0_18px_rgba(0,208,132,0.22)]">
            <Home className="size-4" aria-hidden />
            <span className="sr-only">Kavin Illam</span>
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-[1.0625rem] font-semibold tracking-[-0.02em] text-white">
                Kavin Illam
              </span>
              <span className="block truncate text-[10px] tracking-[0.12em] text-mint/75 uppercase">
                Build · Track · Manage
              </span>
            </span>
          ) : null}
        </Link>
      </div>

      <div
        className={cn(
          "border-b border-sidebar-border px-3 py-3",
          collapsed && "px-2",
        )}
      >
        {!collapsed ? (
          <p className="mb-1.5 px-2 text-[10px] font-medium tracking-[0.08em] text-sidebar-foreground/45 uppercase">
            Project
          </p>
        ) : null}
        <SidebarProjectSwitcher
          projects={projects}
          currentSlug={slug}
          collapsed={collapsed}
          onNavigate={onCloseMobile}
        />
      </div>

      <nav
        className={cn(
          "flex-1 space-y-4 overflow-y-auto px-3 py-4",
          collapsed && "space-y-2 px-2",
        )}
        aria-label={slug ? "Project" : "Application"}
      >
        {groups.map((group) => (
          <div key={group.id} className="space-y-0.5">
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-medium tracking-[0.08em] text-sidebar-foreground/45 uppercase">
                {group.label}
              </p>
            ) : (
              <div
                className="mx-auto mb-1 h-px w-6 bg-sidebar-border/80"
                aria-hidden
              />
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                collapsed={collapsed}
                onNavigate={onCloseMobile}
              />
            ))}
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "mt-auto space-y-3 border-t border-sidebar-border p-3",
          collapsed && "px-2",
        )}
      >
        {!collapsed ? (
          <div className="relative h-[9rem] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/brand/home-sidebar.jpg"
              alt="Modern home exterior"
              width={400}
              height={180}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,47,44,0.96)] via-[rgba(3,47,44,0.5)] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3.5">
              <p className="font-heading text-sm leading-snug tracking-[-0.02em] text-white">
                Every brick
                <br />
                brings us closer.
              </p>
              <p className="mt-1 text-[11px] text-mint/70">
                Build Dreams. Track Progress.
              </p>
            </div>
          </div>
        ) : null}

        <SidebarUserCard
          user={user}
          role={current?.role}
          projectStatus={current?.status}
          collapsed={collapsed}
        />

        <button
          type="button"
          onClick={onToggleCollapsed}
          className={cn(
            "hidden w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-ki-fast hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-mint/40 focus-visible:outline-none lg:flex",
            collapsed && "justify-center px-2",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 border-r border-white/[0.07] text-sidebar-foreground shadow-[0_0_40px_rgba(0,0,0,0.18)] transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex lg:flex-col",
          "bg-[image:var(--ki-gradient-sidebar)]",
          collapsed
            ? "w-[var(--ki-sidebar-collapsed)]"
            : "w-[var(--ki-sidebar-width)]",
        )}
        aria-label="Primary"
      >
        {body}
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            type="button"
            className="animate-in fade-in absolute inset-0 bg-black/50 backdrop-blur-[2px] duration-200"
            aria-label="Close navigation"
            onClick={onCloseMobile}
          />
          <aside className="animate-in slide-in-from-left absolute inset-y-0 left-0 flex w-[min(100%,var(--ki-sidebar-width))] flex-col border-r border-white/[0.07] bg-[image:var(--ki-gradient-sidebar)] text-sidebar-foreground shadow-ki-lg duration-200">
            <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
              <span className="font-heading text-sm text-white">Menu</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-sidebar-foreground/80 transition-ki-fast hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-mint/40 focus-visible:outline-none"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
