import { useCallback } from 'react';
import { notificationTray } from '@amityco/ts-sdk-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../core/routes/RouteParamList';
import useAuth from '../../../../core/hooks/useAuth';
import { useAmityElement } from '../../../hooks';
import { useNotificationTraySeen } from '../../../hooks/useNotificationTraySeen';
import { usePrefetchNotificationTrayItems } from '../../../hooks/collections';
import { useBehaviour } from '../../../providers/BehaviourProvider';
import { ComponentID, ElementID, PageID } from '../../../enums';
import { useStyles } from '../styles';

type UseNotificationTrayButton = {
  pageId: PageID;
  componentId: ComponentID;
};

export function useNotificationTrayButton({
  pageId,
  componentId,
}: UseNotificationTrayButton) {
  const { themeStyles, isExcluded, accessibilityId } = useAmityElement({
    pageId,
    componentId,
    elementId: ElementID.notification_tray_button,
  });
  const { styles, theme } = useStyles(themeStyles);
  const { isConnected, isVisitorOrBot } = useAuth();
  const { AmitySocialHomeTopNavigationComponentBehaviour } = useBehaviour();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Visitors have no tray of their own.
  const isHidden = isExcluded || isVisitorOrBot;
  const { notificationTraySeen } = useNotificationTraySeen({
    enabled: isConnected && !isHidden,
  });
  // Load the tray before it is opened, so it does not open on a skeleton.
  usePrefetchNotificationTrayItems({ enabled: !isHidden });

  const onPress = useCallback(() => {
    // Opening the tray counts as seeing it, which clears the red dot.
    notificationTray.markTraySeen(new Date().toISOString()).catch(() => {
      // The dot then stays until the next open; nothing else depends on it.
    });

    if (
      AmitySocialHomeTopNavigationComponentBehaviour?.goToNotificationTrayPage
    ) {
      return AmitySocialHomeTopNavigationComponentBehaviour.goToNotificationTrayPage();
    }
    return navigation.navigate('NotificationTray');
  }, [AmitySocialHomeTopNavigationComponentBehaviour, navigation]);

  return {
    styles,
    theme,
    onPress,
    isHidden,
    accessibilityId,
    // Only a confirmed unseen tray gets the dot, so a failed fetch shows none.
    hasUnseen: notificationTraySeen?.isSeen === false,
  };
}
