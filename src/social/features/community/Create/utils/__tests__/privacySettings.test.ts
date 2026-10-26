import { CommunityPrivacyOption } from '../../../../../types';
import {
  defaultRequiresJoinApproval,
  toCommunityPrivacySettings,
} from '../privacySettings';

describe('toCommunityPrivacySettings', () => {
  it('maps each option the way the web UIKit does', () => {
    expect(
      toCommunityPrivacySettings(CommunityPrivacyOption.public, false)
    ).toEqual({
      isPublic: true,
      isDiscoverable: true,
      requiresJoinApproval: false,
    });

    expect(
      toCommunityPrivacySettings(CommunityPrivacyOption.privateVisible, true)
    ).toEqual({
      isPublic: false,
      isDiscoverable: true,
      requiresJoinApproval: true,
    });

    expect(
      toCommunityPrivacySettings(CommunityPrivacyOption.privateHidden, true)
    ).toEqual({
      isPublic: false,
      isDiscoverable: false,
      requiresJoinApproval: true,
    });
  });

  it('keeps the approval switch as set, whatever the option', () => {
    expect(
      toCommunityPrivacySettings(CommunityPrivacyOption.public, true)
        .requiresJoinApproval
    ).toBe(true);
    expect(
      toCommunityPrivacySettings(CommunityPrivacyOption.privateHidden, false)
        .requiresJoinApproval
    ).toBe(false);
  });
});

describe('defaultRequiresJoinApproval', () => {
  it('starts on for private options and off for public', () => {
    expect(defaultRequiresJoinApproval(CommunityPrivacyOption.public)).toBe(
      false
    );
    expect(
      defaultRequiresJoinApproval(CommunityPrivacyOption.privateVisible)
    ).toBe(true);
    expect(
      defaultRequiresJoinApproval(CommunityPrivacyOption.privateHidden)
    ).toBe(true);
  });
});
