import { CommunityPrivacyOption } from '../../../../types';

/** The community fields a privacy option sets, as the web UIKit maps them. */
export function toCommunityPrivacySettings(
  privacy: CommunityPrivacyOption,
  requiresJoinApproval: boolean
) {
  return {
    isPublic: privacy === CommunityPrivacyOption.public,
    isDiscoverable: privacy !== CommunityPrivacyOption.privateHidden,
    requiresJoinApproval,
  };
}

/**
 * Whether join approval starts on for a privacy option: a private community
 * starts out needing it, a public one does not.
 */
export const defaultRequiresJoinApproval = (privacy: CommunityPrivacyOption) =>
  privacy !== CommunityPrivacyOption.public;
