import { CommunityRepository } from '@amityco/ts-sdk-react-native';
import { ERROR_CODE } from '../constants';

/**
 * Auto-join is fire-and-forget from the user's point of view — nothing in the UI
 * reports a failure, so a single dropped request silently leaves the user out of
 * a community they expected to be in. Mobile networks drop requests routinely
 * (handover, brief loss of signal, a token still propagating right after
 * sign-in), which is why joins fail intermittently rather than never.
 *
 * Retrying with backoff turns those transient failures into eventual successes.
 * Errors that will not recover on their own are NOT retried — repeating them
 * just burns requests and delays the final failure.
 */

/** Error codes where retrying cannot help; fail immediately instead. */
const NON_RETRYABLE_CODES = [
  ERROR_CODE.GLOBAL_BAN,
  ERROR_CODE.VISITOR_USAGE_LIMIT_EXCEEDED,
  // Rate limited: retrying on our short backoff would make it worse. The next
  // natural trigger (app foreground, screen refresh) retries instead.
  ERROR_CODE.RATE_LIMIT,
];

const isNonRetryable = (error: unknown): boolean => {
  const message = (error as Error)?.message ?? String(error ?? '');
  // The SDK surfaces codes inside the message text (e.g. "Amity SDK (400312):
  // ..."), so substring matching is the available check.
  if (NON_RETRYABLE_CODES.some((code) => message.includes(code))) return true;
  // Permission/authorisation failures mean this session may not join at all —
  // typically a still-read-only visitor session. No amount of retrying fixes it.
  return /forbidden|unauthor(i[sz])?ed|permission/i.test(message);
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type JoinCommunityWithRetryOptions = {
  /** Total attempts including the first. Default 3. */
  maxAttempts?: number;
  /** Base backoff in ms; doubles each retry (1s → 2s → 4s). Default 1000. */
  baseDelayMs?: number;
  /** Called when every attempt failed, with the last error. */
  onFinalFailure?: (error: unknown) => void;
};

/**
 * Join a community, retrying transient failures with exponential backoff.
 *
 * Resolves `true` when the join succeeded, `false` when it did not. It never
 * rejects — callers are background effects where an unhandled rejection would
 * be worse than a silent false.
 */
export const joinCommunityWithRetry = async (
  communityId: string,
  {
    maxAttempts = 3,
    baseDelayMs = 1000,
    onFinalFailure,
  }: JoinCommunityWithRetryOptions = {}
): Promise<boolean> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await CommunityRepository.joinCommunity(communityId);
      return true;
    } catch (error) {
      lastError = error;

      if (isNonRetryable(error)) break;
      // Don't sleep after the final attempt — there is nothing left to wait for.
      if (attempt < maxAttempts - 1) {
        await delay(baseDelayMs * 2 ** attempt);
      }
    }
  }

  onFinalFailure?.(lastError);
  return false;
};
