import {
  COMMENT_ERROR_MESSAGE,
  ERROR_CODE,
  IMAGE_UPLOAD_ERROR_MESSAGE,
  POST_ERROR_MESSAGE,
  PROFILE_ERROR_MESSAGE,
} from '../../core/constants';

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

  return PROFILE_ERROR_MESSAGE.GENERIC;
};

/**
 * Message for a failed image upload, worded for any owner - a profile avatar,
 * a community avatar or a community cover all share this path.
 */
export const getImageUploadErrorMessage = (error: unknown): string => {
  const message = (error as Error)?.message ?? '';

  if (
    message.includes(ERROR_CODE.INVALID_IMAGE) ||
    message.includes(ERROR_CODE.IMAGE_NUDITY) ||
    message.includes(ERROR_CODE.VIOLENCE)
  ) {
    return IMAGE_UPLOAD_ERROR_MESSAGE.INAPPROPRIATE;
  }

  return IMAGE_UPLOAD_ERROR_MESSAGE.GENERIC;
};
