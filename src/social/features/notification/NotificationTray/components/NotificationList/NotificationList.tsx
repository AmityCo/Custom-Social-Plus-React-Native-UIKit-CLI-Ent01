import { SectionList, View } from 'react-native';
import { useStyles } from './styles';
import { useNotificationList } from './hooks/useNotificationList';
import { NotificationItem } from '../NotificationItem';
import { InvitationSection } from '../InvitationSection';
import { EmptyNotification } from '../../elements';
import { Empty } from '../../../../../components';
import Skeleton from '../../../../../../core/components/Skeleton/Skeleton';
import { Typography } from '../../../../../../core/components/Typography/Typography';

export function NotificationList() {
  const {
    styles,
    sections,
    seenIds,
    markSeen,
    onEndReached,
    showSkeleton,
    isLoadingMore,
    hasInvitations,
  } = useNotificationList();

  return (
    <SectionList
      sections={sections}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.container}
      keyExtractor={(item) => item._id}
      ListHeaderComponent={<InvitationSection />}
      renderSectionHeader={({ section }) => (
        <Typography.CaptionBold style={styles.sectionHeader}>
          {section.title}
        </Typography.CaptionBold>
      )}
      renderItem={({ item }) => (
        <NotificationItem
          item={item}
          isSeen={item.isSeen || seenIds.has(item._id)}
          onSeen={markSeen}
        />
      )}
      ListEmptyComponent={
        showSkeleton ? (
          <NotificationList.Skeleton />
        ) : hasInvitations ? null : (
          <Empty heightPercent={0.7}>
            <EmptyNotification />
          </Empty>
        )
      }
      ListFooterComponent={
        isLoadingMore ? (
          <>
            {Array.from({ length: 3 }).map((_, index) => (
              <NotificationItem.Skeleton key={index} />
            ))}
          </>
        ) : null
      }
      onEndReached={onEndReached}
    />
  );
}

function NotificationListSkeleton() {
  const { styles } = useStyles();

  return (
    <>
      {Array.from({ length: 2 }).map((_, section) => (
        <View key={section} style={styles.skeletonSection}>
          <Skeleton style={styles.skeletonHeader}>
            <Skeleton.Line width="30%" height={10} />
          </Skeleton>
          {Array.from({ length: 3 }).map((__, index) => (
            <NotificationItem.Skeleton key={index} />
          ))}
        </View>
      ))}
    </>
  );
}

NotificationList.Skeleton = NotificationListSkeleton;
