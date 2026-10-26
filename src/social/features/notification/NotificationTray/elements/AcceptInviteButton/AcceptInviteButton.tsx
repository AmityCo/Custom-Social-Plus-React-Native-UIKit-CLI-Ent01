import { useAmityElement } from '../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import {
  Button,
  BUTTON_SIZE,
  ButtonProps,
} from '../../../../../components/Button/Button';

type AcceptInviteButtonProps = ButtonProps & {
  pageId?: PageID;
  componentId?: ComponentID;
  elementId?: ElementID;
};

export function AcceptInviteButton({
  pageId = PageID.notification_tray_page,
  componentId = ComponentID.invitation_section,
  elementId = ElementID.accept_invite_button,
  ...props
}: AcceptInviteButtonProps) {
  const { config, isExcluded, accessibilityId } = useAmityElement({
    pageId,
    componentId,
    elementId,
  });

  if (isExcluded) return null;

  return (
    <Button
      type="primary"
      size={BUTTON_SIZE.LARGE}
      testID={accessibilityId}
      {...props}
    >
      {(config?.text as string) ?? 'Join'}
    </Button>
  );
}
