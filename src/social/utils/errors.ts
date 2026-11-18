import {
  COMMENT_ERROR_MESSAGE,
  ERROR_CODE,
  IMAGE_UPLOAD_ERROR_MESSAGE,
  POST_ERROR_MESSAGE,
  PROFILE_ERROR_MESSAGE,
  VIDEO_UPLOAD_ERROR_MESSAGE,
} from '../../core/constants';

// The SDK words a server refusal as "Amity SDK (<code>): <server message>".
const SDK_ERROR_PREFIX = /^Amity SDK \(\d+\): /;

/**
 * The server's own reason for refusing a request, or undefined when the error
 * did not come from the server. A fatal SDK error is the SDK's own
 * "Unexpected error", which says nothing to the user.
 */
const getServerMessage = (error?: { message?: string; level?: string }) => {
  const message = error?.message;
  if (!message || error.level === 'fatal' || !SDK_ERROR_PREFIX.test(message)) {
    return undefined;
  }
  return message.replace(SDK_ERROR_PREFIX, '').trim() || undefined;
};

// social.plus words a pre-hook's refusal as "Deny from prehook: <reason>", with
// code 400000 and no code of the host's own. The reason is the pre-hook's
// message, written for the user.
const PREHOOK_DENY = /Deny from prehook:([\s\S]*)/i;

export const getCommentErrorMessage = (error: Error): string => {
  if (error.message.includes(ERROR_CODE.BLOCKED_WORD)) {
    return COMMENT_ERROR_MESSAGE.BLOCKED_WORD;
  }

  if (error.message.includes(ERROR_CODE.BLOCKED_URL)) {
    return COMMENT_ERROR_MESSAGE.BLOCKED_URL;
  }

  return COMMENT_ERROR_MESSAGE.GENERIC;
};

export const getPostErrorMessage = (
  error: Error,
  isEditMode?: boolean
): string => {
  if (error.message.includes(ERROR_CODE.BLOCKED_WORD)) {
    return POST_ERROR_MESSAGE.BLOCKED_WORD;
  }

  if (error.message.includes(ERROR_CODE.BLOCKED_URL)) {
    return POST_ERROR_MESSAGE.BLOCKED_URL;
  }

  return isEditMode
    ? POST_ERROR_MESSAGE.GENERIC_EDIT
    : POST_ERROR_MESSAGE.GENERIC_CREATE;
};

/**
 * Message for a failed profile save, shared by create and edit.
 *
 * Matching is deliberately not just on `error.message`, because a save can fail
 * in three differently-shaped ways:
 *
 *  1. ASCError/ASCApiError - message is "Amity SDK (<code>): ..." AND `code` is
 *     set, so either matches.
 *  2. The SDK's catch-all, `throw new Error(response?.data ?? error)`. When the
 *     server sent a JSON body, `new Error(object)` stringifies to
 *     "[object Object]" and the code survives only on the thrown value's own
 *     fields - hence the `code` / `data.code` lookups below.
 *  3. No response at all - "AxiosError: Network Error", which is a connection
 *     problem and deserves to say so rather than "try again".
 */
export const getProfileErrorMessage = (error: Error): string => {
  const raw = error as Error & {
    code?: string | number;
    data?: { code?: string | number };
  };
  // One haystack: the message plus any structured code, so a match works
  // whichever shape the failure arrived in.
  const haystack = [raw?.message, raw?.code, raw?.data?.code]
    .filter((part) => part != null)
    .join(' ');

  // First: the host's pre-hook said why (a display name another user already
  // has, for one). Matched anywhere in the message, so an enrollProfile that
  // passes the server's refusal on is covered too.
  const prehookDeny = PREHOOK_DENY.exec(raw?.message ?? '');
  if (prehookDeny) {
    return prehookDeny[1].trim() || PROFILE_ERROR_MESSAGE.GENERIC;
  }

  if (haystack.includes(ERROR_CODE.BLOCKED_WORD)) {
    return PROFILE_ERROR_MESSAGE.BLOCKED_WORD;
  }

  if (haystack.includes(ERROR_CODE.BLOCKED_URL)) {
    return PROFILE_ERROR_MESSAGE.BLOCKED_URL;
  }

  // The avatar is uploaded as part of the save, so a rejected image lands here
  // too. IMAGE_NUDITY is a bare code; INVALID_IMAGE is a whole message.
  if (
    haystack.includes(ERROR_CODE.INVALID_IMAGE) ||
    haystack.includes(ERROR_CODE.IMAGE_NUDITY) ||
    haystack.includes(ERROR_CODE.VIOLENCE)
  ) {
    return PROFILE_ERROR_MESSAGE.INAPPROPRIATE_IMAGE;
  }

  if (haystack.includes(ERROR_CODE.DISPLAY_NAME_UPDATE)) {
    return PROFILE_ERROR_MESSAGE.DISPLAY_NAME_NOT_ALLOWED;
  }

  if (haystack.includes(ERROR_CODE.GLOBAL_BAN)) {
    return PROFILE_ERROR_MESSAGE.GLOBAL_BAN;
  }

  if (haystack.includes(ERROR_CODE.RATE_LIMIT)) {
    return PROFILE_ERROR_MESSAGE.RATE_LIMIT;
  }

  // The SDK flattens a transport failure to this exact text; it is a connection
  // problem, not something retrying the same tap will fix.
  if (/network error/i.test(haystack)) {
    return PROFILE_ERROR_MESSAGE.NETWORK;
  }

  // Any other refusal: the server's reason (a display name the network does
  // not accept, for one) tells the user more than "please try again".
  return getServerMessage(raw) ?? PROFILE_ERROR_MESSAGE.GENERIC;
};

/**
 * Message for a failed image upload, worded for any owner - a profile avatar,
 * a community avatar or a community cover all share this path.
 */
export const getImageUploadErrorMessage = (error: unknown): string => {
  // uploadImageFile (the post composer's upload) wraps the SDK's error as
  // { message, code, originalError }, so look inside the wrapper too.
  const raw = error as {
    message?: string;
    code?: string | number;
    originalError?: { message?: string; code?: string | number };
  };
  const haystack = [
    raw?.message,
    raw?.code,
    raw?.originalError?.message,
    raw?.originalError?.code,
  ]
    .filter((part) => part != null)
    .join(' ');

  if (
    raw?.code === 'INVALID_IMAGE' ||
    haystack.includes(ERROR_CODE.INVALID_IMAGE) ||
    haystack.includes(ERROR_CODE.IMAGE_NUDITY) ||
    haystack.includes(ERROR_CODE.VIOLENCE)
  ) {
    return IMAGE_UPLOAD_ERROR_MESSAGE.INAPPROPRIATE;
  }

  return IMAGE_UPLOAD_ERROR_MESSAGE.GENERIC;
};

/**
 * Message for a failed video upload in the post composer. AI moderation
 * refuses unsafe content with 400314, the same code as for images.
 */
export const getVideoUploadErrorMessage = (error: unknown): string => {
  const raw = error as { message?: string; code?: string | number };
  const haystack = [raw?.message, raw?.code]
    .filter((part) => part != null)
    .join(' ');

  if (haystack.includes(ERROR_CODE.VIOLENCE)) {
    return VIDEO_UPLOAD_ERROR_MESSAGE.INAPPROPRIATE;
  }

  return VIDEO_UPLOAD_ERROR_MESSAGE.GENERIC;
};

/**
 * Message for a failed report of a post, comment or reply.
 *
 * A refusal the server answers with 403 (codes 4003xx: already reported, banned,
 * no permission) carries a reason written for the user - "You have already
 * flagged this post." - which says more than "please try again". Anything else,
 * such as a dropped connection, gets the caller's generic message.
 */
export const getReportErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const raw = error as { message?: string; level?: string; code?: unknown };
  const code = Number(raw?.code);
  if (code >= 400300 && code < 400400) {
    return getServerMessage(raw) ?? fallback;
  }
  return fallback;
};
