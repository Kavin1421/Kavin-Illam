/**
 * Active (not soft-deleted) filter for Prisma + MongoDB.
 *
 * Optional `deletedAt` fields that were never written are *unset* in MongoDB.
 * Prisma still returns them as `null` when reading, but
 * `where: { deletedAt: null }` only matches documents where the field is
 * explicitly set to BSON null — so newly created rows never appear in lists.
 * Soft-deleted rows set `deletedAt` to a Date (field is set).
 *
 * Spread into Prisma `where` clauses (and relation filters) instead of
 * `deletedAt: null`.
 */
export const notDeleted = {
  OR: [{ deletedAt: { isSet: false } }, { deletedAt: null }],
};
