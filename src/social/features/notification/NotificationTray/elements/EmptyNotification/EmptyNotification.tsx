import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useAmityElement } from '../../../../../hooks';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import { emptyNotification } from '../../../../../../core/assets/icons';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import { useStyles } from './styles';

type EmptyNotificationProps = {
  pageId?: PageID;
  componentId?: ComponentID;
};

export function EmptyNotification({
  pageId = PageID.notification_tray_page,
  componentId = ComponentID.WildCardComponent,
}: EmptyNotificationProps) {
  const { config, isExcluded, accessibilityId, themeStyles } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.empty_notification,
  });
  const { styles, theme } = useStyles(themeStyles);

  if (isExcluded) return null;

  return (
    <View style={styles.container} testID={accessibilityId}>
      <SvgXml
        xml={emptyNotification()}
        width={60}
        height={45}
        color={theme.colors.secondaryShade4}
      />
      <Typography.TitleBold style={styles.text}>
        {(config?.text as string) ?? 'No notifications'}
      </Typography.TitleBold>
    </View>
  );
}
