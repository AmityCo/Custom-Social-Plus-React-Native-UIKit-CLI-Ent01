import { getNotificationDestination } from '../getNotificationDestination';

const makeItem = (fields: Record<string, unknown>) =>
  ({
    _id: 'item-1',
    actors: [],
    targetId: 'target-1',
    targetType: 'community',
    actionType: 'comment',
    ...fields,
  } as unknown as Amity.NotificationTrayItem);

describe('getNotificationDestination', () => {
  it('opens the community for posts, polls and join requests', () => {
    ['post', 'poll', 'join_request'].forEach((actionType) => {
      expect(
        getNotificationDestination(
          makeItem({ actionType, targetId: 'community-1' })
        )
      ).toEqual({
        page: 'CommunityProfilePage',
        params: { communityId: 'community-1' },
      });
    });
  });

  it('opens the follower for a follow', () => {
    expect(
      getNotificationDestination(
        makeItem({
          actionType: 'user',
          trayItemCategory: 'follow',
          actors: [{ publicId: 'follower-1' }],
        })
      )
    ).toEqual({ page: 'UserProfile', params: { userId: 'follower-1' } });
  });

  it("opens an event's community, or nothing without one", () => {
    expect(
      getNotificationDestination(
        makeItem({
          trayItemCategory: 'event_created',
          event: { originType: 'community', originId: 'community-2' },
        })
      )
    ).toEqual({
      page: 'CommunityProfilePage',
      params: { communityId: 'community-2' },
    });

    // A deleted event comes back as null; the item's target is the community.
    expect(
      getNotificationDestination(
        makeItem({
          trayItemCategory: 'event_reminder',
          event: null,
          targetType: 'community',
          targetId: 'community-3',
        })
      )
    ).toEqual({
      page: 'CommunityProfilePage',
      params: { communityId: 'community-3' },
    });

    expect(
      getNotificationDestination(
        makeItem({
          trayItemCategory: 'event_started',
          event: { originType: 'user', originId: 'user-1' },
          targetType: 'user',
        })
      )
    ).toBeUndefined();
  });

  it('has nowhere to open a co-host invitation', () => {
    expect(
      getNotificationDestination(
        makeItem({ trayItemCategory: 'room_cohost_invite' })
      )
    ).toBeUndefined();
  });

  it("opens the viewer's own profile editor for a profile reset", () => {
    expect(
      getNotificationDestination(
        makeItem({
          actionType: 'user',
          trayItemCategory: 'user_profile_reset',
        }),
        'me'
      )
    ).toEqual({ page: 'EditUser', params: { userId: 'me' } });
  });

  it('opens the post through the reference the category names', () => {
    expect(
      getNotificationDestination(
        makeItem({
          actionType: 'reaction',
          trayItemCategory: 'reaction_on_post',
          actionReferenceId: 'post-1',
          referenceId: 'other',
        })
      )
    ).toEqual({ page: 'PostDetail', params: { postId: 'post-1' } });

    expect(
      getNotificationDestination(
        makeItem({
          actionType: 'comment',
          actionReferenceId: 'comment-1',
          referenceId: 'post-2',
        })
      )
    ).toEqual({ page: 'PostDetail', params: { postId: 'post-2' } });
  });
});
