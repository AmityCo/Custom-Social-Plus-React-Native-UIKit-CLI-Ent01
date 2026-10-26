import { RootStackParamList } from '../../../../../core/routes/RouteParamList';

export type NotificationDestination =
  | { page: 'PostDetail'; params: RootStackParamList['PostDetail'] }
  | {
      page: 'CommunityProfilePage';
      params: RootStackParamList['CommunityProfilePage'];
    }
  | { page: 'UserProfile'; params: RootStackParamList['UserProfile'] }
  | { page: 'EditUser'; params: RootStackParamList['EditUser'] };

const COMMUNITY_ACTION_TYPES = ['poll', 'post', 'join_request'];

export const EVENT_TRAY_CATEGORIES = [
  'event_created',
  'event_reminder',
  'event_started',
];

// For these the post is the action's reference; for comments, replies and
// their reactions it is the item's reference.
const POST_AS_ACTION_REFERENCE = [
  'reaction_on_post',
  'mention_in_post',
  'mention_in_poll',
];

/**
 * The community an event item belongs to, if any.
 *
 * A deleted event comes back as `event: null`, so the item's own target is the
 * only place left to find it.
 */
export function getEventCommunityId(item: Amity.NotificationTrayItem) {
  if ((item.event?.originType as string) === 'community') {
    return item.event?.originId;
  }
  if (item.targetType === 'community') return item.targetId;
  return undefined;
}

/**
 * Which page a tray item opens, in the same order as the web UIKit's tray.
 *
 * Returns undefined when this UIKit has nowhere to take the item.
 */
export function getNotificationDestination(
  item: Amity.NotificationTrayItem,
  currentUserId?: string
): NotificationDestination | undefined {
  // Both are ambient const enums in the SDK typings, so read them as strings.
  const category = item.trayItemCategory as string | undefined;
  const actionType = item.actionType as string;

  if (COMMUNITY_ACTION_TYPES.includes(actionType)) {
    return {
      page: 'CommunityProfilePage',
      params: { communityId: item.targetId },
    };
  }

  if (category === 'follow') {
    const userId = item.actors[0]?.publicId;
    return userId ? { page: 'UserProfile', params: { userId } } : undefined;
  }

  // There is no event page, so an event opens the community hosting it.
  if (category && EVENT_TRAY_CATEGORIES.includes(category)) {
    const communityId = getEventCommunityId(item);
    return communityId
      ? { page: 'CommunityProfilePage', params: { communityId } }
      : undefined;
  }

  // A co-host invitation needs the livestream player, which the tray does not
  // open.
  if (category === 'room_cohost_invite') return undefined;

  if (actionType === 'user') {
    return currentUserId
      ? { page: 'EditUser', params: { userId: currentUserId } }
      : undefined;
  }

  const postId =
    category && POST_AS_ACTION_REFERENCE.includes(category)
      ? item.actionReferenceId
      : item.referenceId;
  return postId ? { page: 'PostDetail', params: { postId } } : undefined;
}
