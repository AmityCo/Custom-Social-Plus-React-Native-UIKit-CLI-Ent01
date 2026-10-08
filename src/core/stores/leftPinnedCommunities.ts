/**
 * leftPinnedCommunities
 *
 * Remembers which pinned communities a user has dropped out of, so the Explore
 * pinned auto-join (ExploreProvider) does not put them straight back.
 *
 * Pinned communities are auto-joined for every user, and the only membership
 * signal the client has is `isJoined` - which reads the same for "never joined"
 * and "joined, then left". Without a record of the leave, the auto-join cannot
 * tell the two apart: it re-joined immediately (the pinned live collection
 * re-emits on leave) and again on every later launch.
 *
 * Keyed per user, since several users can sign in on one device, and mirrored
 * to AsyncStorage so a leave survives an app restart. Device-local: a leave made
 * while this app was not running (e.g. on another device) is not known here.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string) => `@amity/leftPinnedCommunities/${userId}`;

const leftByUser = new Map<string, Set<string>>();
const hydrationByUser = new Map<string, Promise<void>>();

const getLeftSet = (userId: string): Set<string> => {
  let left = leftByUser.get(userId);
  if (!left) {
    left = new Set();
    leftByUser.set(userId, left);
  }
  return left;
};

/**
 * Resolves once the user's persisted record has been read. Reads once per user
 * per run; never rejects - storage being unavailable only costs persistence.
 */
export const loadLeftPinnedCommunities = (userId: string): Promise<void> => {
  let hydration = hydrationByUser.get(userId);
  if (!hydration) {
    hydration = AsyncStorage.getItem(storageKey(userId))
      .then((stored) => {
        const ids: unknown = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(ids)) return;
        // Merge rather than replace: a leave recorded while the read was in
        // flight is newer than what is on disk.
        const left = getLeftSet(userId);
        ids.forEach((id) => typeof id === 'string' && left.add(id));
      })
      .catch(() => {});
    hydrationByUser.set(userId, hydration);
  }
  return hydration;
};

/** Whether the user has left this pinned community. Await the load first. */
export const hasLeftPinnedCommunity = (
  userId: string,
  communityId: string
): boolean => leftByUser.get(userId)?.has(communityId) ?? false;

/** Record that the user left (or was removed from) a pinned community. */
export const markPinnedCommunityLeft = (
  userId: string,
  communityId: string
): void => {
  // In memory first, synchronously, so the auto-join run triggered by this same
  // leave already sees it.
  getLeftSet(userId).add(communityId);
  // Persist only after hydration, or this write would replace the stored
  // record with a partial one.
  loadLeftPinnedCommunities(userId).then(() =>
    AsyncStorage.setItem(
      storageKey(userId),
      JSON.stringify([...getLeftSet(userId)])
    ).catch(() => {})
  );
};
