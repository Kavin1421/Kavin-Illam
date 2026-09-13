/**
 * Only platform superadmins may create projects directly.
 * Everyone else must submit an access request for superadmin approval.
 */
export function canCreateProjectAsSuperadmin(isSuperadmin: boolean): boolean {
  return isSuperadmin;
}
