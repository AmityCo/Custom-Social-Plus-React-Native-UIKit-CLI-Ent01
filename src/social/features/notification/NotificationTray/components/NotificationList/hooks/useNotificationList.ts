import { useCallback, useEffect, useMemo } from 'react';
import {
  useNotificationTrayInvitations,
  useNotificationTrayItemsCollection,
} from '../../../../../../hooks/collections';
import { useToast } from '../../../../../../../core/stores/slices/toastSlice';
import { TOAST } from '../../../../../../../core/constants';
import { useStyles } from '../styles';

export type NotificationSection = {
  title: string;
  data: Amity.NotificationTrayItem[];
};

export function useNotificationList() {
  const { styles } = useStyles();
  const { showToast } = useToast();
  const {
    notifications,
    seenIds,
    markSeen,
    hasMore,
    loadMore,
    isLoadingMore,
    isLoadingFirstPage,
    hasLoadedFirstPage,
    error,
  } = useNotificationTrayItemsCollection({ refreshOnMount: true });
  const { invitations, hasLoadedInvitations } =
    useNotificationTrayInvitations();

  const sections = useMemo<NotificationSection[]>(
    () =>
      [
        {
          title: 'Recent',
          data: notifications.filter((item) => item.isRecent),
        },
        {
          title: 'Older',
          data: notifications.filter((item) => !item.isRecent),
        },
      ].filter((section) => section.data.length > 0),
    [notifications]
  );

  // Keyed on the error alone: showToast is a new function every render.
  useEffect(() => {
    if (!error) return;
    showToast({ type: 'failed', message: TOAST.NOTIFICATION_TRAY.LOAD.FAILED });
  }, [error]);

  const onEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoadingFirstPage) loadMore();
  }, [hasMore, isLoadingMore, isLoadingFirstPage, loadMore]);

  return {
    styles,
    sections,
    seenIds,
    markSeen,
    onEndReached,
    isLoadingMore,
    // A failed first load keeps the skeleton rather than claiming there is
    // nothing. Invitations count as something: with any, there is no empty
    // state.
    showSkeleton:
      !hasLoadedFirstPage ||
      isLoadingFirstPage ||
      !hasLoadedInvitations ||
      (!!error && notifications.length === 0),
    hasInvitations: invitations.length > 0,
  };
}
