"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, FolderKanban, Plus, Search } from "lucide-react";

import {
  formatProjectType,
  type ShellProject,
} from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

export function SidebarProjectSwitcher({
  projects,
  currentSlug,
  collapsed,
  onNavigate,
  canCreateProject = false,
}: {
  projects: ShellProject[];
  currentSlug: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
  canCreateProject?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const current =
    projects.find((project) => project.slug === currentSlug) ?? null;

  const filtered = projects.filter((project) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      project.name.toLowerCase().includes(q) ||
      project.slug.toLowerCase().includes(q) ||
      formatProjectType(project.projectType).toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function toggleOpen() {
    if (open) {
      setOpen(false);
      setQuery("");
      return;
    }
    setOpen(true);
  }

  function closeAndNavigate() {
    setOpen(false);
    setQuery("");
    onNavigate?.();
  }

  const triggerLabel = current?.name ?? "Select project";
  const triggerMeta = current
    ? formatProjectType(current.projectType)
    : projects.length
      ? `${projects.length} available`
      : "No projects yet";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={collapsed ? triggerLabel : undefined}
        onClick={toggleOpen}
        className={cn(
          "flex w-full items-center gap-2 rounded-[0.875rem] text-left text-sm text-white transition-ki-fast focus-visible:ring-2 focus-visible:ring-mint/40 focus-visible:outline-none",
          "border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.07]",
          collapsed ? "justify-center px-2 py-2.5" : "px-2.5 py-2.5",
        )}
      >
        {collapsed ? (
          <span className="bg-sidebar-accent flex size-9 items-center justify-center rounded-lg">
              <FolderKanban className="text-mint size-4" />
            </span>
          ) : (
            <>
              <span className="bg-sidebar-accent flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FolderKanban className="text-mint size-4" />
              </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{triggerLabel}</span>
              <span className="text-sidebar-foreground/50 block truncate text-xs">
                {triggerMeta}
              </span>
            </span>
            <ChevronsUpDown className="text-sidebar-foreground/45 size-4 shrink-0" />
          </>
        )}
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Projects"
          className={cn(
            "border border-white/10 bg-[color-mix(in_srgb,var(--ki-surface)_94%,black)] absolute z-30 mt-1 overflow-hidden rounded-xl shadow-ki-lg backdrop-blur-xl",
            collapsed
              ? "left-0 w-[min(18rem,calc(100vw-2rem))]"
              : "inset-x-0",
          )}
        >
          <div className="border-sidebar-border border-b p-2">
            <label className="relative block">
              <Search className="text-sidebar-foreground/45 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a project…"
                className="bg-sidebar-accent/60 placeholder:text-sidebar-foreground/40 w-full rounded-lg border-0 py-2 pr-3 pl-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              />
            </label>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="text-sidebar-foreground/55 px-3 py-3 text-sm">
                {projects.length === 0
                  ? "No projects yet"
                  : "No matching projects"}
              </p>
            ) : (
              filtered.map((project) => {
                const active = project.slug === currentSlug;
                return (
                  <Link
                    key={project.slug}
                    role="option"
                    aria-selected={active}
                    href={`/p/${project.slug}`}
                    onClick={closeAndNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-ki-fast",
                      active
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {project.name}
                      </span>
                      <span className="text-sidebar-foreground/45 block truncate text-xs">
                        {formatProjectType(project.projectType)}
                      </span>
                    </span>
                    {active ? (
                      <Check className="text-mint size-4 shrink-0" />
                    ) : null}
                  </Link>
                );
              })
            )}
          </div>

          <div className="border-sidebar-border space-y-0.5 border-t p-1">
            <Link
              href="/projects"
              onClick={closeAndNavigate}
              className="text-sidebar-foreground/85 hover:bg-white/5 hover:text-white flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-ki-fast"
            >
              <FolderKanban className="size-4 opacity-70" />
              All projects
            </Link>
            {canCreateProject ? (
              <Link
                href="/projects/new"
                onClick={closeAndNavigate}
                className="text-sidebar-foreground/85 hover:bg-white/5 hover:text-white flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-ki-fast"
              >
                <Plus className="size-4 opacity-70" />
                New project
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
