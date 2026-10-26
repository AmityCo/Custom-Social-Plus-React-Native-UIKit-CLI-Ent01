import { View } from 'react-native';
import { useInvitationSection } from './hooks/useInvitationSection';
import { InvitationItem } from '../InvitationItem';
import { InvitationSectionTitle } from '../../elements';

export function InvitationSection() {
  const { accessibilityId, isHidden, invitations, seenInvitationIds } =
    useInvitationSection();

  if (isHidden) return null;

  return (
    <View testID={accessibilityId}>
      <InvitationSectionTitle />
      {invitations.map((invitation) => (
        <InvitationItem
          key={invitation.invitationId}
          invitation={invitation}
          isSeen={seenInvitationIds.has(invitation.invitationId)}
        />
      ))}
    </View>
  );
}
