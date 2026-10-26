import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { CommunityRepository } from '@amityco/ts-sdk-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../../../../core/routes/RouteParamList';
import { useToast } from '../../../../../../../core/stores/slices/toastSlice';
import { ALERT, ERROR_CODE, TOAST } from '../../../../../../../core/constants';
import { useBehaviour } from '../../../../../../providers/BehaviourProvider';
import { useNotificationTrayInvitations } from '../../../../../../hooks/collections';
import { useStyles } from '../styles';

type UseInvitationItem = {
  invitation: Amity.Invitation;
};

export function useInvitationItem({ invitation }: UseInvitationItem) {
  const { styles } = useStyles();
  const { showToast } = useToast();
  const { markSeen, refresh } = useNotificationTrayInvitations();
  const { AmityNotificationTrayPageBehavior } = useBehaviour();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isPending, setIsPending] = useState(false);

  const { invitationId, targetId: communityId } = invitation;
  const community = invitation.target as Amity.Community | undefined;
  const communityName = community?.displayName ?? '';
  const inviter = invitation.createdBy;
  const description = `${
    inviter?.displayName ?? ''
  } invited you to join ${communityName}.`;

  const goToCommunity = useCallback(() => {
    const params = { communityId };
    if (AmityNotificationTrayPageBehavior?.goToCommunityProfilePage) {
      return AmityNotificationTrayPageBehavior.goToCommunityProfilePage(params);
    }
    return navigation.push('CommunityProfilePage', params);
  }, [AmityNotificationTrayPageBehavior, communityId, navigation]);

  const showFailure = useCallback(
    (error: unknown, message: string) => {
      const reason = error instanceof Error ? error.message : String(error);
      showToast({
        type: 'informative',
        message: reason.includes(ERROR_CODE.INVITATION_UNAVAILABLE)
          ? TOAST.COMMUNITY_INVITATION.UNAVAILABLE
          : message,
      });
    },
    [showToast]
  );

  const onPress = useCallback(() => {
    markSeen(invitationId);
    goToCommunity();
    refresh();
  }, [goToCommunity, invitationId, markSeen, refresh]);

  const onAccept = useCallback(async () => {
    setIsPending(true);
    try {
      await invitation.accept();
      // Pull the community so its page opens already joined.
      await CommunityRepository.getCommunityByIds([communityId]);
      showToast({
        type: 'success',
        message: TOAST.COMMUNITY_INVITATION.ACCEPT.SUCCESS(communityName),
      });
      goToCommunity();
    } catch (error) {
      showFailure(error, TOAST.COMMUNITY_INVITATION.ACCEPT.FAILED);
    } finally {
      setIsPending(false);
      refresh();
    }
  }, [
    communityId,
    communityName,
    goToCommunity,
    invitation,
    refresh,
    showFailure,
    showToast,
  ]);

  const decline = useCallback(async () => {
    setIsPending(true);
    try {
      await invitation.reject();
      showToast({
        type: 'success',
        message: TOAST.COMMUNITY_INVITATION.DECLINE.SUCCESS,
      });
    } catch (error) {
      showFailure(error, TOAST.COMMUNITY_INVITATION.DECLINE.FAILED);
    } finally {
      setIsPending(false);
      refresh();
    }
  }, [invitation, refresh, showFailure, showToast]);

  // Declining one that needs approval means asking to join from scratch, so
  // that is confirmed first.
  const onDecline = useCallback(() => {
    if (!community?.requiresJoinApproval) {
      decline();
      return;
    }
    Alert.alert(
      ALERT.COMMUNITY_INVITATION.DECLINE.TITLE,
      ALERT.COMMUNITY_INVITATION.DECLINE.MESSAGE,
      [
        { text: ALERT.ACTION.CANCEL, style: 'cancel' },
        {
          text: ALERT.COMMUNITY_INVITATION.DECLINE.ACTION,
          style: 'destructive',
          onPress: decline,
        },
      ]
    );
  }, [community?.requiresJoinApproval, decline]);

  return {
    styles,
    inviter,
    description,
    communityName,
    isPending,
    onPress,
    onAccept,
    onDecline,
  };
}
