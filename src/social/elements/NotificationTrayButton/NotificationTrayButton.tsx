import { TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { bell } from '../../../core/assets/icons';
import { ComponentID, PageID } from '../../enums';
import { useNotificationTrayButton } from './hooks/useNotificationTrayButton';

type NotificationTrayButtonProps = {
  pageId?: PageID;
  componentId?: ComponentID;
};

export function NotificationTrayButton({
  pageId = PageID.WildCardPage,
  componentId = ComponentID.WildCardComponent,
}: NotificationTrayButtonProps) {
  const { styles, theme, onPress, isHidden, accessibilityId, hasUnseen } =
    useNotificationTrayButton({ pageId, componentId });

  if (isHidden) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      testID={accessibilityId}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnseen ? 'Notifications, new activity' : 'Notifications'
      }
    >
      <SvgXml xml={bell()} width={16} height={16} color={theme.colors.base} />
      {hasUnseen && (
        <View
          style={styles.redDotWrapper}
          testID={`${accessibilityId}/red_dot`}
        >
          <View style={styles.redDot} />
        </View>
      )}
    </TouchableOpacity>
  );
}
