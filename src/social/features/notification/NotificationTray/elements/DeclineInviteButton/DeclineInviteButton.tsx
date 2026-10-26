import { useAmityElement } from '../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import {
  Button,
  BUTTON_SIZE,
  ButtonProps,
} from '../../../../../components/Button/Button';

type DeclineInviteButtonProps = ButtonProps & {
  pageId?: PageID;
  componentId?: ComponentID;
  elementId?: ElementID;
};

export function DeclineInviteButton({
  pageId = PageID.notification_tray_page,
  componentId = ComponentID.invitation_section,
  elementId = ElementID.decline_invite_button,
  ...props
}: DeclineInviteButtonProps) {
  const { config, isExcluded, accessibilityId } = useAmityElement({
    pageId,
    componentId,
    elementId,
  });

  if (isExcluded) return null;

  return (
    <Button
      type="secondary"
      size={BUTTON_SIZE.LARGE}
      testID={accessibilityId}
      {...props}
    >
      {(config?.text as string) ?? 'Decline'}
    </Button>
  );
}
