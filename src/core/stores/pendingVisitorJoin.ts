/**
 * pendingVisitorJoin
 *
 * Bridges the visitor "Join community" tap to the moment the visitor becomes a
 * signed-in user, so the UIKit can auto-join that community once joining is
 * allowed.
 *
 * A visitor cannot join a community (read-only session). When a visitor taps
 * Join, `useGlobalBehavior` records the tapped communityId here, then the host
 * runs its sign-in / create-profile flow. When `AuthProvider` sees the session
 * become `signed-in`, it consumes this value and performs the join.
 *
 * A module-level store (not React context) is used because the recorder
 * (useGlobalBehavior, deep in the social tree) and the consumer (AuthProvider,
 * at the root) live in different subtrees; a singleton is the simplest reliable
 * channel between them. The value is additionally mirrored to AsyncStorage so a
 * pending join survives a JS reload or app restart mid sign-in flow — without
 * that, backgrounding the app during the host's sign-in UI loses the join.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@amity/pendingVisitorJoin';

let pendingCommunityId: string | undefined;

// Hydration runs once at module load. Reads stay synchronous (the in-memory
// value is the source of truth), so callers that need the persisted value
// before hydration settles await this promise first.
const hydrated: Promise<void> = AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    // An in-memory value recorded during this session always wins — it is newer
    // than whatever was left on disk by a previous run.
    if (stored && !pendingCommunityId) pendingCommunityId = stored;
  })
  .catch(() => {
    // Storage unavailable — fall back to in-memory only. Never throw: a failed
    // hydrate must not break sign-in.
  });

/** Resolves once the persisted pending join (if any) has been read. */
export const waitForPendingVisitorJoinHydration = (): Promise<void> => hydrated;

/** Record the community a visitor tapped Join on, to auto-join after sign-in. */
export const setPendingVisitorJoin = (communityId?: string): void => {
  pendingCommunityId = communityId;
  // Fire-and-forget: the in-memory value already covers the common path, so a
  // storage failure only costs persistence across a reload.
  if (communityId) {
    AsyncStorage.setItem(STORAGE_KEY, communityId).catch(() => {});
  } else {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }
};

/**
 * Read the pending community id WITHOUT clearing it.
 *
 * Prefer this over `consumePendingVisitorJoin` when the caller performs a
 * network join: clearing up front means a failed request loses the id forever
 * with no way to retry. Clear explicitly via `clearPendingVisitorJoin` once the
 * join has actually succeeded (or failed unrecoverably).
 */
export const peekPendingVisitorJoin = (): string | undefined =>
  pendingCommunityId;

/** Clear the pending community id. Safe to call when nothing is pending. */
export const clearPendingVisitorJoin = (): void => {
  pendingCommunityId = undefined;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
};

/**
 * Read and clear the pending community id (consume-once).
 *
 * Retained for callers that only need the value and do no fallible work with
 * it. For network joins use `peekPendingVisitorJoin` + `clearPendingVisitorJoin`
 * so a transient failure stays retryable.
 */
export const consumePendingVisitorJoin = (): string | undefined => {
  const id = pendingCommunityId;
  clearPendingVisitorJoin();
  return id;
};

// Listeners notified once the auto-join has completed on the network. Screens
// that filter by join state (e.g. Explore's recommended list) subscribe so they
// can re-fetch — otherwise they may have loaded before the async join finished
// and would show stale (pre-join) results.
const joinCompletedListeners = new Set<() => void>();

/** Subscribe to auto-join completion. Returns an unsubscribe fn. */
export const onVisitorAutoJoinCompleted = (
  listener: () => void
): (() => void) => {
  joinCompletedListeners.add(listener);
  return () => joinCompletedListeners.delete(listener);
};

/** Fire after the auto-join network call resolves. */
export const notifyVisitorAutoJoinCompleted = (): void => {
  joinCompletedListeners.forEach((listener) => listener());
};
