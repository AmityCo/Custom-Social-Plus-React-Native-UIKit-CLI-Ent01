import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  InvitationRepository,
  notificationTray,
} from '@amityco/ts-sdk-react-native';

/**
 * The notification tray's subscriptions - its items and the user's pending
 * community invitations - shared by the tray button and the tray page.
 *
 * The SDK drops its copy of a collection when the subscription closes, so a
 * page subscribing on its own started from nothing on every open and showed a
 * skeleton for the whole first request. The button keeps these subscriptions
 * open while it is on screen and the page reads from them, so the tray opens
 * with what was last loaded and refreshes behind it.
 */

const PAGE_LIMIT = 20;
const SEEN_INVITATIONS_KEY = 'amity.notificationTray.seenInvitations';

export type NotificationTraySnapshot = {
  notifications: Amity.NotificationTrayItem[];
  /** Tapped this session. The SDK does not re-emit an item marked seen. */
  seenIds: ReadonlySet<string>;
  hasLoadedFirstPage: boolean;
  isLoadingFirstPage: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  invitations: Amity.Invitation[];
  hasLoadedInvitations: boolean;
  /** Opened at some point; kept across launches, as the web tray does. */
  seenInvitationIds: ReadonlySet<string>;
};

const EMPTY_SNAPSHOT: NotificationTraySnapshot = {
  notifications: [],
  seenIds: new Set(),
  hasLoadedFirstPage: false,
  isLoadingFirstPage: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  invitations: [],
  hasLoadedInvitations: false,
  seenInvitationIds: new Set(),
};

let snapshot = EMPTY_SNAPSHOT;
let ownerId: string | undefined;
let retainCount = 0;
let unsubscribeItems: Amity.Unsubscriber | undefined;
let unsubscribeInvitations: Amity.Unsubscriber | undefined;
let loadNextPage: (() => void) | undefined;
const listeners = new Set<() => void>();

function update(next: Partial<NotificationTraySnapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

const seenInvitationsKey = (userId: string) =>
  `${SEEN_INVITATIONS_KEY}.${userId}`;

function subscribeItems() {
  unsubscribeItems?.();
  // Per subscription: its first answer is the first page, later ones are the
  // pages after it.
  let hasFirstPage = false;

  unsubscribeItems = notificationTray.getNotificationTrayItems(
    { limit: PAGE_LIMIT },
    ({ data, loading, error, hasNextPage, onNextPage }) => {
      loadNextPage = hasNextPage ? onNextPage : undefined;

      if (!hasFirstPage) {
        if (loading) {
          // A new subscription starts empty; keep what is on screen until it
          // answers.
          update({ isLoadingFirstPage: !snapshot.hasLoadedFirstPage });
          return;
        }
        hasFirstPage = true;
        update({
          notifications: error ? snapshot.notifications : data,
          hasLoadedFirstPage: true,
          isLoadingFirstPage: false,
          hasMore: !!hasNextPage,
          error: error ?? null,
        });
        return;
      }

      update({
        notifications: loading ? snapshot.notifications : data,
        isLoadingMore: loading,
        hasMore: !!hasNextPage,
        error: error ?? null,
      });
    }
  );
}

function subscribeInvitations() {
  unsubscribeInvitations?.();
  // The collection follows accepts and declines itself, dropping whatever is
  // no longer pending.
  unsubscribeInvitations = InvitationRepository.getMyCommunityInvitations(
    { limit: PAGE_LIMIT },
    ({ data, loading, error }) => {
      // A new subscription starts empty; keep what is on screen meanwhile. A
      // failed load still counts as loaded, so the tray does not wait on it.
      if (loading) return;
      update({
        invitations: error ? snapshot.invitations : data,
        hasLoadedInvitations: true,
      });
    }
  );
}

function loadSeenInvitations(userId: string) {
  AsyncStorage.getItem(seenInvitationsKey(userId))
    .then((stored) => {
      if (ownerId !== userId || !stored) return;
      update({ seenInvitationIds: new Set(JSON.parse(stored) as string[]) });
    })
    .catch(() => {
      // Without it every invitation reads as new, which is the safe side.
    });
}

/**
 * Keep the tray subscribed while the caller is mounted. `refresh` re-fetches
 * now, still showing the current data meanwhile.
 *
 * @returns the release function.
 */
export function retainNotificationTray(
  userId: string,
  { refresh = false }: { refresh?: boolean } = {}
) {
  if (ownerId !== userId) {
    unsubscribeItems?.();
    unsubscribeInvitations?.();
    unsubscribeItems = undefined;
    unsubscribeInvitations = undefined;
    ownerId = userId;
    update(EMPTY_SNAPSHOT);
    loadSeenInvitations(userId);
  }

  retainCount += 1;
  if (!unsubscribeItems || refresh) subscribeItems();
  if (!unsubscribeInvitations || refresh) subscribeInvitations();

  return () => {
    retainCount = Math.max(0, retainCount - 1);
    if (retainCount > 0) return;
    unsubscribeItems?.();
    unsubscribeInvitations?.();
    unsubscribeItems = undefined;
    unsubscribeInvitations = undefined;
  };
}

export function loadMoreNotificationTrayItems() {
  if (!snapshot.isLoadingMore) loadNextPage?.();
}

export function refreshNotificationTrayInvitations() {
  if (unsubscribeInvitations) subscribeInvitations();
}

export function markNotificationTrayItemSeen(id: string) {
  if (snapshot.seenIds.has(id)) return;
  update({ seenIds: new Set(snapshot.seenIds).add(id) });
}

export function markNotificationTrayInvitationSeen(id: string) {
  if (!ownerId || snapshot.seenInvitationIds.has(id)) return;
  const seenInvitationIds = new Set(snapshot.seenInvitationIds).add(id);
  update({ seenInvitationIds });
  AsyncStorage.setItem(
    seenInvitationsKey(ownerId),
    JSON.stringify([...seenInvitationIds])
  ).catch(() => {
    // Seen for this session either way.
  });
}

export function subscribeToNotificationTray(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Another user's tray is never handed out, even before it is replaced. */
export function getNotificationTraySnapshot(userId?: string) {
  return userId && userId === ownerId ? snapshot : EMPTY_SNAPSHOT;
}
