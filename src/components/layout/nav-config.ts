import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckSquare,
  FileText,
  Flag,
  FolderKanban,
  FolderOpen,
  HandCoins,
  Inbox,
  LayoutDashboard,
  PiggyBank,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

export type ShellNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (e.g. Dashboard at /p/slug) */
  exact?: boolean;
  /** Optional count badge (e.g. pending access requests) */
  badge?: number;
};

export type ShellNavGroup = {
  id: string;
  label: string;
  items: ShellNavItem[];
};

export type ShellProject = {
  name: string;
  slug: string;
  projectType?: string;
  status?: string;
  role?: string;
};

export function formatProjectType(projectType?: string | null): string {
  if (!projectType) return "Project";
  return projectType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function projectNavGroups(slug: string): ShellNavGroup[] {
  const base = `/p/${slug}`;
  return [
    {
      id: "overview",
      label: "Overview",
      items: [
        { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: `${base}/activity`, label: "Activity", icon: Activity },
        { href: `${base}/reports`, label: "Reports", icon: BarChart3 },
      ],
    },
    {
      id: "money",
      label: "Money",
      items: [
        { href: `${base}/finance`, label: "Finance", icon: Wallet },
        { href: `${base}/budget`, label: "Budget", icon: PiggyBank },
        { href: `${base}/advances`, label: "Advances", icon: HandCoins },
        {
          href: `${base}/payment-requests`,
          label: "Requests",
          icon: FileText,
        },
      ],
    },
    {
      id: "build",
      label: "Build",
      items: [
        { href: `${base}/documents`, label: "Documents", icon: FolderOpen },
        { href: `${base}/tasks`, label: "Tasks", icon: CheckSquare },
        { href: `${base}/milestones`, label: "Milestones", icon: Flag },
      ],
    },
    {
      id: "admin",
      label: "Admin",
      items: [
        { href: `${base}/members`, label: "Members", icon: Users },
        { href: `${base}/settings`, label: "Settings", icon: Settings },
      ],
    },
  ];
}

/** Flat list for breadcrumbs / active matching */
export function projectNavItems(slug: string): ShellNavItem[] {
  return projectNavGroups(slug).flatMap((group) => group.items);
}

export const globalNavGroups: ShellNavGroup[] = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];

export function platformAdminNavGroup(
  pendingAccessRequests = 0,
): ShellNavGroup {
  return {
    id: "platform",
    label: "Platform",
    items: [
      {
        href: "/admin/access-requests",
        label: "Access requests",
        icon: Inbox,
        badge: pendingAccessRequests > 0 ? pendingAccessRequests : undefined,
      },
    ],
  };
}

export const globalNavItems: ShellNavItem[] = globalNavGroups.flatMap(
  (group) => group.items,
);

export function extractProjectSlug(pathname: string): string | null {
  const match = pathname.match(/^\/p\/([^/]+)/);
  return match?.[1] ?? null;
}

export function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
