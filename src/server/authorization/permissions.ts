import type { ProjectRole } from "@prisma/client";

export const PERMISSIONS = [
  "PROJECT_VIEW",
  "PROJECT_EDIT",
  "FINANCE_VIEW",
  "FINANCE_CREATE",
  "FINANCE_EDIT",
  "FINANCE_APPROVE",
  "FINANCE_DELETE",
  "DOCUMENT_VIEW",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_EDIT",
  "DOCUMENT_DELETE",
  "PAYMENT_REQUEST_CREATE",
  "PAYMENT_REQUEST_APPROVE",
  "BUDGET_VIEW",
  "BUDGET_EDIT",
  "TASK_VIEW",
  "TASK_CREATE",
  "TASK_EDIT",
  "MEMBER_VIEW",
  "MEMBER_INVITE",
  "MEMBER_REMOVE",
  "AUDIT_VIEW",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const VIEWER: Permission[] = [
  "PROJECT_VIEW",
  "FINANCE_VIEW",
  "DOCUMENT_VIEW",
  "BUDGET_VIEW",
  "TASK_VIEW",
  "MEMBER_VIEW",
];

const ENGINEER: Permission[] = [
  ...VIEWER,
  "FINANCE_CREATE",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_EDIT",
  "PAYMENT_REQUEST_CREATE",
  "TASK_CREATE",
  "TASK_EDIT",
];

const ACCOUNTANT: Permission[] = [
  ...VIEWER,
  "FINANCE_CREATE",
  "FINANCE_EDIT",
  "FINANCE_APPROVE",
  "PAYMENT_REQUEST_APPROVE",
  "BUDGET_EDIT",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_VIEW",
  "AUDIT_VIEW",
];

const ARCHITECT: Permission[] = [
  ...VIEWER,
  "DOCUMENT_UPLOAD",
  "DOCUMENT_EDIT",
  "TASK_CREATE",
  "TASK_EDIT",
];

const CONTRACTOR: Permission[] = [
  "PROJECT_VIEW",
  "DOCUMENT_VIEW",
  "DOCUMENT_UPLOAD",
  "TASK_VIEW",
  "TASK_EDIT",
  "PAYMENT_REQUEST_CREATE",
  "MEMBER_VIEW",
];

const ADMIN: Permission[] = ALL.filter((p) => p !== "FINANCE_DELETE");

export const ROLE_PERMISSIONS: Record<ProjectRole, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN,
  ENGINEER,
  ACCOUNTANT,
  ARCHITECT,
  CONTRACTOR,
  VIEWER,
};

export function roleHasPermission(
  role: ProjectRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
