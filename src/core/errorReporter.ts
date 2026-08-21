import { ERROR_CODE } from './constants';

/** Where inside the UIKit a failure originated. */
export type AmityErrorSource =
  /** A React render crash caught by the UIKit's ErrorBoundary. */
  | 'render'
  /** A read failed (react-query query). */
  | 'query'
  /** A write failed (react-query mutation) - post, comment, reaction... */
  | 'mutation'
  /** Login, session establishment, or auth-token renewal failed. */
  | 'auth'
  /** A direct SDK call outside react-query (push registration, retries...). */
  | 'sdk';

export interface AmityUIKitError {
  source: AmityErrorSource;
  /** Human-readable message, safe to log. */
  message: string;
  /**
   * Amity error code when the SDK supplied one, e.g. '400312' (global ban).
   * See ERROR_CODE in core/constants for the known values.
   */
  code?: string;
  /** The original thrown value, for stack traces / crash reporters. */
  cause?: unknown;
  /** Extra context: queryKey, componentStack, userId, mutationKey... */
  context?: Record<string, unknown>;
  /**
   * True when the UIKit already surfaced this to the user (an error toast, or
   * the ErrorBoundary fallback screen). False means the failure was otherwise
   * silent - usually the ones worth alerting on.
   */
  handled: boolean;
}

export type AmityErrorHandler = (error: AmityUIKitError) => void;

/**
 * Module-level rather than React context on purpose.
 *
 * Errors originate in places a context consumer cannot reach: the SDK's
 * sessionWillRenewAccessToken callback (fires outside React), plain utility
 * functions like joinCommunityWithRetry, and the QueryClient - which is a
 * module singleton created above the provider's own render.
 */
let handler: AmityErrorHandler | undefined;
let registration = 0;

/**
 * Registered by AmityUiKitProvider from its `onError` prop. Returns a
 * registration id to hand back to releaseErrorHandler on unmount.
 */
export const setErrorHandler = (fn?: AmityErrorHandler): number => {
  handler = fn;
  return ++registration;
};

/**
 * Clears the handler only if `id` is still the most recent registration.
 *
 * Without the check, unmount ordering silently drops the handler: React
 * renders the incoming tree before running the outgoing tree's cleanup, so
 * swapping between two providers (e.g. a tab switch) would let the *old*
 * provider's cleanup wipe the handler the *new* one had just installed.
 */
export const releaseErrorHandler = (id: number): void => {
  if (id === registration) {
    handler = undefined;
  }
};

/**
 * Forwards an error to the host's `onError`. Never throws: a failure inside
 * the host's reporter must not take down the UIKit, and reporting is always
 * best-effort.
 */
export const reportError = (error: AmityUIKitError): void => {
  try {
    handler?.(error);
  } catch {
    // Intentionally ignored - see above.
  }
};

const KNOWN_ERROR_CODES = Object.values(ERROR_CODE) as string[];

/**
 * Pulls an Amity error code out of a thrown value.
 *
 * The SDK reports codes inside the message text (e.g.
 * "Amity SDK (400312): user is banned"), so prefer an exact match against the
 * codes we know, then fall back to any 6-digit sequence.
 */
export const extractAmityCode = (error: unknown): string | undefined => {
  const message =
    typeof error === 'string' ? error : (error as Error)?.message ?? '';
  if (!message) return undefined;

  const known = KNOWN_ERROR_CODES.find((code) => message.includes(code));
  if (known) return known;

  return message.match(/\b(\d{6})\b/)?.[1];
};

/** Normalises any thrown value into a message string. */
export const errorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error) return error;
  return (error as Error)?.message || fallback;
};

/**
 * Reports an error that the UIKit catches but otherwise only logs - a direct
 * SDK call that failed outside react-query. `location` identifies the call
 * site (e.g. 'FeedStyle.togglePostReaction') so the host can tell them apart.
 */
export const reportSwallowed = (location: string, error: unknown): void => {
  // Still logged, so replacing the call sites' own console.log does not remove
  // output a host relied on when no `onError` is supplied.
  console.log(`[AmityUIKit] ${location}:`, error);
  reportError({
    source: 'sdk',
    message: errorMessage(error, `${location} failed`),
    code: extractAmityCode(error),
    cause: error,
    context: { location },
    handled: false,
  });
};
