import { useAmityElement } from '../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import { useStyles } from './styles';

type InvitationSectionTitleProps = {
  pageId?: PageID;
  componentId?: ComponentID;
};

export function InvitationSectionTitle({
  pageId = PageID.notification_tray_page,
  componentId = ComponentID.invitation_section,
}: InvitationSectionTitleProps) {
  const { config, isExcluded, accessibilityId, themeStyles } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.invitation_section_title,
  });
  const { styles } = useStyles(themeStyles);

  if (isExcluded) return null;

  return (
    <Typography.CaptionBold testID={accessibilityId} style={styles.title}>
      {(config?.text as string) ?? 'Requests'}
    </Typography.CaptionBold>
  );
}
