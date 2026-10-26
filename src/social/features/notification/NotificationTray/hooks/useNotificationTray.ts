import { useAmityPage } from '../../../../hooks';
import { PageID } from '../../../../enums';
import { useStyles } from '../styles';

export function useNotificationTray() {
  const { styles } = useStyles();
  const { accessibilityId } = useAmityPage({
    pageId: PageID.notification_tray_page,
  });

  return { styles, accessibilityId };
}
