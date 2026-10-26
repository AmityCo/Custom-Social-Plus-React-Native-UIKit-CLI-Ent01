import { SafeAreaView } from 'react-native-safe-area-context';
import { TopBar, NotificationList } from './components';
import { useNotificationTray } from './hooks';

export function NotificationTray() {
  const { styles, accessibilityId } = useNotificationTray();

  return (
    <SafeAreaView
      testID={accessibilityId}
      style={styles.container}
      edges={['top']}
    >
      <TopBar />
      <NotificationList />
    </SafeAreaView>
  );
}
