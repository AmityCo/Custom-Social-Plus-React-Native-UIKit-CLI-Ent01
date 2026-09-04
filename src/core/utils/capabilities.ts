/**
 * Role-gated capabilities.
 *
 * A "normal user" is one with NO roles at all. Amity grants permissions through
 * roles, so zero roles means zero permissions — and there is no API to
 * enumerate a user's permissions (`client.hasPermission()` is a per-permission
 * check), so roles are the check.
 *
 * Note these gate UI affordances only. They are not a security boundary: a
 * modified client or a direct SDK call bypasses them. Anything that must be
 * guaranteed has to be enforced server-side as well.
 */
import { isAdmin } from './role';

/** True when the user holds no roles — the default, unprivileged user. */
export const isNormalUser = (userRoles?: string[]): boolean =>
  !userRoles?.length;

/**
 * Only global admins may create communities.
 *
 * Community moderators deliberately do NOT qualify: in Amity a community's
 * creator automatically becomes its moderator, so allowing moderators to
 * create communities would let the privilege propagate on its own.
 */
export const canCreateCommunity = (userRoles?: string[]): boolean =>
  isAdmin(userRoles);

/**
 * Only global admins may attach video to a post.
 *
 * Scoped to global roles on purpose. `community-moderator` is a per-community
 * membership role that never appears in `Client.getCurrentUser().roles`, so a
 * moderator-based rule would need an async membership lookup per post target.
 * That branch was dropped: since only admins can create communities, and a
 * creator is automatically that community's moderator, community moderators are
 * in practice the admins who already pass this check.
 */
export const canPostVideo = (userRoles?: string[]): boolean =>
  isAdmin(userRoles);
