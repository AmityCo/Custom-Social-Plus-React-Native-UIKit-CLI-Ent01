import { Image, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useStyles } from './styles';
import { useNotificationItem } from './hooks/useNotificationItem';
import Avatar from '../../../../../components/Avatar';
import TimestampElement from '../../../../../elements/TimestampElement/TimestampElement';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import Skeleton from '../../../../../../core/components/Skeleton/Skeleton';
import { community } from '../../../../../../core/assets/icons';
import { EventTypeBadge } from '../../elements';
import { PageID } from '../../../../../enums';

export type NotificationItemProps = {
  item: Amity.NotificationTrayItem;
  isSeen: boolean;
  onSeen: (id: string) => void;
};

export function NotificationItem({
  item,
  isSeen,
  onSeen,
}: NotificationItemProps) {
  const { styles, textParts, leading, eventInfo, onPress } =
    useNotificationItem({ item, onSeen });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.text}
      style={[styles.container, !isSeen && styles.unseen]}
      onPress={onPress}
    >
      {/* The avatar is touchable on its own; let the row take the tap. */}
      <View style={styles.leading} pointerEvents="none">
        {leading.type === 'user' && (
          <Avatar.User
            uri={leading.uri}
            userName={leading.name}
            imageStyle={styles.avatar}
          />
        )}
        {leading.type === 'community' &&
          (leading.uri ? (
            <Image source={{ uri: leading.uri }} style={styles.avatar} />
          ) : (
            <View style={styles.communityPlaceholder}>
              <SvgXml xml={community()} width={20} height={12} />
            </View>
          ))}
        {leading.type === 'eventCover' && (
          <Image source={{ uri: leading.uri }} style={styles.eventCover} />
        )}
      </View>
      <View style={styles.content}>
        <Typography.Body>
          {textParts.map((part, index) =>
            part.isHighlighted ? (
              <Typography.BodyBold key={index}>{part.text}</Typography.BodyBold>
            ) : (
              <Typography.Body key={index}>{part.text}</Typography.Body>
            )
          )}
        </Typography.Body>
        {eventInfo && (
          <View style={styles.eventContext}>
            <EventTypeBadge type={eventInfo.type} />
            <Typography.Caption style={styles.eventDateTime}>
              {eventInfo.date}
            </Typography.Caption>
            <Typography.Caption style={styles.eventDateTime}>
              {eventInfo.time}
            </Typography.Caption>
          </View>
        )}
      </View>
      <TimestampElement
        pageID={PageID.notification_tray_page}
        createdAt={item.lastOccurredAt}
        style={styles.timestamp}
      />
    </TouchableOpacity>
  );
}

function NotificationItemSkeleton() {
  const { styles } = useStyles();

  return (
    <Skeleton style={styles.skeleton}>
      <Skeleton.Circle width={32} height={32} />
      <View style={styles.skeletonDetails}>
        <Skeleton.Line width="75%" height={10} />
        <Skeleton.Line width="40%" height={10} />
      </View>
    </Skeleton>
  );
}

NotificationItem.Skeleton = NotificationItemSkeleton;
