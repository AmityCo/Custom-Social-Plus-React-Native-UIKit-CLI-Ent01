import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CommunityRepository,
  notificationTray,
} from '@amityco/ts-sdk-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { RootStackParamList } from '../../../../../../../core/routes/RouteParamList';
import useAuth from '../../../../../../../core/hooks/useAuth';
import { useToast } from '../../../../../../../core/stores/slices/toastSlice';
import { TOAST } from '../../../../../../../core/constants';
import { useBehaviour } from '../../../../../../providers/BehaviourProvider';
import { getFileUrlWithSize } from '../../../../../../utils';
import {
  EVENT_TRAY_CATEGORIES,
  getEventCommunityId,
  getNotificationDestination,
  parseTemplatedText,
} from '../../../utils';
import { useStyles } from '../styles';

type UseNotificationItem = {
  item: Amity.NotificationTrayItem;
  onSeen: (id: string) => void;
};

export type NotificationLeading =
  | { type: 'user'; uri?: string; name?: string }
  | { type: 'community'; uri?: string }
  | { type: 'eventCover'; uri: string };

/**
 * The community behind an event item, for its avatar. Fetched only when the
 * event does not carry it - always the case once the event is deleted.
 */
function useEventCommunity(communityId: string | undefined, enabled: boolean) {
  const [community, setCommunity] = useState<Amity.Community>();

  useEffect(() => {
    if (!enabled || !communityId) return undefined;
    return CommunityRepository.getCommunity(
      communityId,
      ({ data, loading, error }) => {
        if (!loading && !error && data) setCommunity(data);
      }
    );
  }, [communityId, enabled]);

  return community;
}

export function useNotificationItem({ item, onSeen }: UseNotificationItem) {
  const { styles, theme } = useStyles();
  const { client } = useAuth();
  const { showToast } = useToast();
  const { AmityNotificationTrayPageBehavior } = useBehaviour();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const category = item.trayItemCategory as string | undefined;
  const isEventItem = !!category && EVENT_TRAY_CATEGORIES.includes(category);
  const isEventCreated = category === 'event_created' && item.event != null;
  const isEventDeleted = isEventItem && item.event == null;
  const leadsWithCommunity = isEventCreated || isEventDeleted;

  const textParts = useMemo(
    () => parseTemplatedText(item.templatedText, item.text),
    [item.templatedText, item.text]
  );

  const fetchedCommunity = useEventCommunity(
    getEventCommunityId(item),
    leadsWithCommunity && !item.event?.targetCommunity
  );

  const leading = useMemo<NotificationLeading>(() => {
    const coverUrl = item.event?.coverImage?.fileUrl;
    if (!leadsWithCommunity && coverUrl) {
      return {
        type: 'eventCover',
        uri: getFileUrlWithSize(coverUrl, 'medium'),
      };
    }
    if (leadsWithCommunity || item.event) {
      const community = item.event?.targetCommunity ?? fetchedCommunity;
      const avatarUrl = community?.avatar?.fileUrl;
      return {
        type: 'community',
        uri: avatarUrl ? getFileUrlWithSize(avatarUrl, 'small') : undefined,
      };
    }
    // A profile reset is about the viewer, not an actor.
    const user =
      (item.actionType as string) === 'user' ? undefined : item.users[0];
    return {
      type: 'user',
      uri: user?.avatarCustomUrl ?? user?.avatar?.fileUrl,
      name: user?.displayName,
    };
  }, [item, leadsWithCommunity, fetchedCommunity]);

  const eventInfo = useMemo(() => {
    if (!isEventCreated || !item.event) return undefined;
    const startTime = dayjs(item.event.startTime);
    return {
      type: item.event.type,
      date: startTime.format('MMM D, YYYY'),
      time: startTime.format('h:mm A'),
    };
  }, [isEventCreated, item.event]);

  const onPress = useCallback(() => {
    // Seen either way: the user tapped it, whether or not it opens anything.
    onSeen(item._id);
    notificationTray
      .markItemsSeen([{ id: item._id, lastSeenAt: new Date().toISOString() }])
      .catch(() => {
        // Only the item's highlight depends on this, and the tap cleared it.
      });

    const destination = getNotificationDestination(
      item,
      (client as Amity.Client | undefined)?.userId
    );
    if (!destination) {
      showToast({
        type: 'failed',
        message: TOAST.NOTIFICATION_TRAY.OPEN.FAILED,
      });
      return;
    }

    const behavior = AmityNotificationTrayPageBehavior;
    switch (destination.page) {
      case 'CommunityProfilePage':
        if (behavior?.goToCommunityProfilePage) {
          return behavior.goToCommunityProfilePage(destination.params);
        }
        return navigation.push('CommunityProfilePage', destination.params);
      case 'UserProfile':
        if (behavior?.goToUserProfilePage) {
          return behavior.goToUserProfilePage(destination.params);
        }
        return navigation.push('UserProfile', destination.params);
      case 'EditUser':
        if (behavior?.goToEditUserPage) {
          return behavior.goToEditUserPage(destination.params);
        }
        return navigation.push('EditUser', destination.params);
      case 'PostDetail':
        if (behavior?.goToPostDetailPage) {
          return behavior.goToPostDetailPage(destination.params);
        }
        return navigation.push('PostDetail', destination.params);
    }
  }, [
    AmityNotificationTrayPageBehavior,
    client,
    item,
    navigation,
    onSeen,
    showToast,
  ]);

  return { styles, theme, textParts, leading, eventInfo, onPress };
}
