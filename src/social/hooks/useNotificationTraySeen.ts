import { useEffect, useState } from 'react';
import { notificationTray } from '@amityco/ts-sdk-react-native';

// The tray's seen state updates live when it is marked seen, but a new
// notification arriving has no realtime event, so it is re-fetched on a timer.
const POLLING_INTERVAL = 60 * 1000;

/**
 * @param enabled false stops the subscription and the poll. Callers that may
 *   render nothing (excluded element, visitor) still have to call the hook, so
 *   the skipping happens here.
 */
export function useNotificationTraySeen({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const [notificationTraySeen, setNotificationTraySeen] =
    useState<Amity.NotificationTraySeen>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;

    let unsubscribe: Amity.Unsubscriber | undefined;

    const subscribe = () => {
      unsubscribe?.();
      unsubscribe = notificationTray.getNotificationTraySeen(
        ({ data, loading }) => {
          if (data) setNotificationTraySeen(data);
          setIsLoading(loading);
        }
      );
    };

    subscribe();
    const intervalId = setInterval(subscribe, POLLING_INTERVAL);

    return () => {
      unsubscribe?.();
      clearInterval(intervalId);
    };
  }, [enabled]);

  return { notificationTraySeen, isLoading };
}
