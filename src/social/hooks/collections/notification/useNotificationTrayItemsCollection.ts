import { useCallback, useEffect, useSyncExternalStore } from 'react';
import useAuth from '../../../../core/hooks/useAuth';
import {
  getNotificationTraySnapshot,
  loadMoreNotificationTrayItems,
  markNotificationTrayInvitationSeen,
  markNotificationTrayItemSeen,
  refreshNotificationTrayInvitations,
  retainNotificationTray,
  subscribeToNotificationTray,
} from './notificationTrayStore';

type UseNotificationTrayItems = {
  enabled?: boolean;
  /** Re-fetch on mount, keeping the last data on screen meanwhile. */
  refreshOnMount?: boolean;
};

function useCurrentUserId(enabled = true) {
  const { client, isConnected } = useAuth();
  const userId = (client as Amity.Client | undefined)?.userId;
  return enabled && isConnected ? userId : undefined;
}

function useNotificationTraySnapshot(userId: string | undefined) {
  const getSnapshot = useCallback(
    () => getNotificationTraySnapshot(userId),
    [userId]
  );
  return useSyncExternalStore(subscribeToNotificationTray, getSnapshot);
}

/**
 * Keep the notification tray loaded in the background, so it opens on data
 * instead of a skeleton. Renders nothing and does not re-render on updates.
 */
export function usePrefetchNotificationTrayItems({
  enabled = true,
}: Pick<UseNotificationTrayItems, 'enabled'> = {}) {
  const userId = useCurrentUserId(enabled);

  useEffect(() => {
    if (!userId) return undefined;
    return retainNotificationTray(userId);
  }, [userId]);
}

/**
 * The notification tray items, from subscriptions shared with
 * usePrefetchNotificationTrayItems; see notificationTrayStore. Keeps them
 * subscribed while mounted.
 */
export function useNotificationTrayItemsCollection({
  enabled = true,
  refreshOnMount = false,
}: UseNotificationTrayItems = {}) {
  const userId = useCurrentUserId(enabled);

  useEffect(() => {
    if (!userId) return undefined;
    return retainNotificationTray(userId, { refresh: refreshOnMount });
  }, [userId, refreshOnMount]);

  const snapshot = useNotificationTraySnapshot(userId);

  return {
    ...snapshot,
    loadMore: loadMoreNotificationTrayItems,
    markSeen: markNotificationTrayItemSeen,
  };
}

/**
 * The user's pending community invitations shown in the tray. Reads the tray's
 * shared subscriptions, so it relies on useNotificationTrayItemsCollection or
 * usePrefetchNotificationTrayItems keeping them open.
 */
export function useNotificationTrayInvitations() {
  const userId = useCurrentUserId();
  const { invitations, hasLoadedInvitations, seenInvitationIds } =
    useNotificationTraySnapshot(userId);

  return {
    invitations,
    hasLoadedInvitations,
    seenInvitationIds,
    markSeen: markNotificationTrayInvitationSeen,
    refresh: refreshNotificationTrayInvitations,
  };
}
