/**
 * Soft-delete filters for Prisma + MongoDB.
 *
 * Optional `deletedAt` fields that were never written are *unset* in MongoDB.
 * Prisma still returns them as `null` when reading, but
 * `where: { deletedAt: null }` only matches documents where the field is
 * explicitly set to BSON null — so newly created rows never appear in lists.
 * Soft-deleted rows set `deletedAt` to a Date (field is set).
 *
 * Prefer spreading {@link notDeleted} in new code. The Prisma client extension
 * also rewrites bare `deletedAt: null` filters so older / accidental queries
 * stay correct.
 */

/** Explicit filter for active (not soft-deleted) rows. */
export const notDeleted = {
  OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

function isDeletedAtNullFilter(value: unknown): boolean {
  if (value === null) return true;
  if (!isPlainObject(value)) return false;
  return (
    Object.keys(value).length === 1 &&
    Object.prototype.hasOwnProperty.call(value, "equals") &&
    value.equals === null
  );
}

function isUnsetDeletedAtBranch(node: unknown): boolean {
  return (
    isPlainObject(node) &&
    Object.keys(node).length === 1 &&
    isPlainObject(node.deletedAt) &&
    node.deletedAt.isSet === false
  );
}

function isNullDeletedAtBranch(node: unknown): boolean {
  return (
    isPlainObject(node) &&
    Object.keys(node).length === 1 &&
    node.deletedAt === null
  );
}

/** True when `OR` is already the expanded active soft-delete clause. */
function isExpandedNotDeletedOr(or: unknown): boolean {
  if (!Array.isArray(or) || or.length !== 2) return false;
  return isUnsetDeletedAtBranch(or[0]) && isNullDeletedAtBranch(or[1]);
}

/**
 * True when `node` is already the expanded active soft-delete OR clause.
 * Prevents double-rewriting `{ deletedAt: null }` inside {@link notDeleted}.
 */
function isExpandedNotDeleted(node: unknown): boolean {
  return (
    isPlainObject(node) &&
    Object.keys(node).length === 1 &&
    isExpandedNotDeletedOr(node.OR)
  );
}

/**
 * Rewrite a Prisma `where` clause so `deletedAt: null` matches both unset and
 * explicit-null fields on MongoDB.
 */
export function rewriteWhereSoftDelete(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteWhereSoftDelete(item));
  }
  if (!isPlainObject(node)) {
    return node;
  }
  if (isExpandedNotDeleted(node)) {
    return node;
  }

  const rest: Record<string, unknown> = {};
  let hadDeletedAtNull = false;

  for (const [key, value] of Object.entries(node)) {
    if (key === "deletedAt" && isDeletedAtNullFilter(value)) {
      hadDeletedAtNull = true;
      continue;
    }
    if (key === "OR" && isExpandedNotDeletedOr(value)) {
      rest[key] = value;
      continue;
    }
    rest[key] = rewriteWhereSoftDelete(value);
  }

  if (!hadDeletedAtNull) {
    return rest;
  }

  if (Object.keys(rest).length === 0) {
    return { ...notDeleted };
  }

  return {
    AND: [{ ...notDeleted }, rest],
  };
}

const SKIP_REWRITE_KEYS = new Set([
  "data",
  "create",
  "createMany",
  "update",
  "updateMany",
  "connect",
  "connectOrCreate",
  "disconnect",
  "set",
]);

/**
 * Walk Prisma operation args and rewrite every nested `where` (including
 * relation filters under `include` / `select`). Leaves write payloads alone
 * so `data: { deletedAt: null }` still clears a soft-delete.
 */
export function rewriteSoftDeleteArgs<T>(args: T): T {
  return rewriteArgsNode(args) as T;
}

function rewriteArgsNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteArgsNode(item));
  }
  if (!isPlainObject(node)) {
    return node;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "where") {
      out[key] = rewriteWhereSoftDelete(value);
    } else if (SKIP_REWRITE_KEYS.has(key)) {
      out[key] = value;
    } else {
      out[key] = rewriteArgsNode(value);
    }
  }
  return out;
}
