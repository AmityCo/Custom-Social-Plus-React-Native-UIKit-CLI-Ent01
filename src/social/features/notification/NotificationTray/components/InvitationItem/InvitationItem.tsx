import { TouchableOpacity, View } from 'react-native';
import { useInvitationItem } from './hooks/useInvitationItem';
import Avatar from '../../../../../components/Avatar';
import TimestampElement from '../../../../../elements/TimestampElement/TimestampElement';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import { AcceptInviteButton, DeclineInviteButton } from '../../elements';
import { ComponentID, PageID } from '../../../../../enums';

export type InvitationItemProps = {
  invitation: Amity.Invitation;
  isSeen: boolean;
};

export function InvitationItem({ invitation, isSeen }: InvitationItemProps) {
  const {
    styles,
    inviter,
    description,
    communityName,
    isPending,
    onPress,
    onAccept,
    onDecline,
  } = useInvitationItem({ invitation });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={description}
      style={[styles.container, !isSeen && styles.unseen]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {/* The avatar is touchable on its own; let the row take the tap. */}
        <View style={styles.leading} pointerEvents="none">
          <Avatar.User
            uri={inviter?.avatarCustomUrl ?? inviter?.avatar?.fileUrl}
            userName={inviter?.displayName}
            imageStyle={styles.avatar}
          />
        </View>
        <Typography.Body style={styles.description}>
          {description}
        </Typography.Body>
        <TimestampElement
          pageID={PageID.notification_tray_page}
          componentID={ComponentID.invitation_section}
          createdAt={invitation.createdAt}
          style={styles.timestamp}
        />
      </View>
      <View style={styles.actions}>
        <AcceptInviteButton
          style={styles.action}
          disabled={isPending}
          onPress={onAccept}
          accessibilityLabel={`Join ${communityName}`}
        />
        <DeclineInviteButton
          style={styles.action}
          disabled={isPending}
          onPress={onDecline}
          accessibilityLabel={`Decline the invitation to ${communityName}`}
        />
      </View>
    </TouchableOpacity>
  );
}
