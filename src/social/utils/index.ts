export const isValidImageType = (mimeType: string | undefined): boolean => {
  // Some Android pickers/cameras return no MIME or a non-JPEG/PNG image type
  // (e.g. image/heic, image/webp). Treat a missing MIME as acceptable (let the
  // upload host validate it) and accept any image/* type, so a valid photo is
  // never silently dropped by client-side validation.
  if (!mimeType) return true;

  return mimeType.toLowerCase().startsWith('image/');
};

/**
 * Build the URL for a file at a given size.
 *
 * Not `FileRepository.fileUrlWithSize`, which is `${fileUrl}?size=${size}` with
 * no regard for what the URL already carries. Amity hands back avatars already
 * sized - `/download?size=small` - so asking for another size produced
 * `/download?size=small?size=large`. Two query starts means the server never
 * sees a valid `size`, the request fails, and a viewer with no error state
 * (react-native-image-viewing) spins forever.
 *
 * Any existing `size` is replaced and every other parameter is kept, so signed
 * or CDN URLs passed through `avatarCustomUrl` keep working.
 */
export const getFileUrlWithSize = (
  fileUrl: string,
  size: 'small' | 'medium' | 'large' | 'full' = 'medium'
) => {
  if (!fileUrl) return fileUrl;

  const [base, query] = fileUrl.split('?');
  const kept = (query ?? '')
    .split('&')
    .filter((part) => part && !part.startsWith('size='))
    .join('&');

  return `${base}?${kept ? `${kept}&` : ''}size=${size}`;
};

// Comment types the comment lists render.
const RENDERED_COMMENT_TYPES = ['text', 'image'];

/**
 * Whether a comment belongs in a comment list. Use it in place of a `dataTypes`
 * filter on the getComments query.
 *
 * The SDK applies that query filter to `comment.dataTypes`, which the comment
 * it creates optimistically on send does not carry (it only has `dataType`).
 * So the filter dropped it, and a new comment only appeared once the server
 * answered. A failed send is left out as well - the composer restores its text
 * instead.
 */
export const isVisibleComment = (comment: Amity.InternalComment): boolean => {
  // Amity.SyncState is an ambient const enum, so it cannot be read at runtime.
  if ((comment.syncState as string) === 'error') return false;
  const types = (comment as { dataTypes?: string[] }).dataTypes ?? [
    comment.dataType ?? 'text',
  ];
  return types.some((type) => RENDERED_COMMENT_TYPES.includes(type));
};

/** Whether a comment was created optimistically and is not yet on the server. */
export const isPendingComment = (comment: Amity.InternalComment): boolean =>
  (comment.syncState as string) === 'syncing';

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const isPinnedPost = (post: any): post is Amity.PinnedPost => {
  return post.pinnedAt !== undefined;
};

/**
 * Strips non-serializable properties (functions, class instances) from an
 * Amity.Community SDK object before passing it as a React Navigation param.
 * React Navigation warns when navigation state contains non-serializable
 * values; SDK objects can contain methods such as `createInvitations`.
 */
export const serializeCommunity = (
  community: Amity.Community | undefined | null
): Amity.Community | undefined => {
  if (!community) return undefined;
  return {
    communityId: community.communityId,
    displayName: community.displayName,
    isPublic: community.isPublic,
    isJoined: community.isJoined,
    isOfficial: community.isOfficial,
    postSetting: community.postSetting,
    allowCommentInStory: community.allowCommentInStory,
    avatarFileId: community.avatarFileId,
    description: community.description,
    membersCount: community.membersCount,
    postsCount: community.postsCount,
    needApprovalOnPostCreation: (community as Record<string, unknown>)
      .needApprovalOnPostCreation,
  } as unknown as Amity.Community;
};
