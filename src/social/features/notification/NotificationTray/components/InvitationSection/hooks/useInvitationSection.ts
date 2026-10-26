import { useAmityComponent } from '../../../../../../hooks';
import { useNotificationTrayInvitations } from '../../../../../../hooks/collections';
import { ComponentID, PageID } from '../../../../../../enums';

// The web tray shows the latest three; the rest wait their turn.
const VISIBLE_INVITATIONS = 3;

export function useInvitationSection() {
  const { accessibilityId, isExcluded } = useAmityComponent({
    pageId: PageID.notification_tray_page,
    componentId: ComponentID.invitation_section,
  });
  const { invitations, seenInvitationIds } = useNotificationTrayInvitations();

  return {
    accessibilityId,
    isHidden: isExcluded || invitations.length === 0,
    invitations: invitations.slice(0, VISIBLE_INVITATIONS),
    seenInvitationIds,
  };
}
