import { useCallback, useEffect, useState } from 'react';
import { CommunityRepository } from '@amityco/ts-sdk-react-native';

type Membership = 'all' | 'member' | 'notMember';

/**
 * The SDK's live collection puts the community from every join, leave, update
 * or delete event at the head of the list without re-applying the query's
 * filters, so a community the user just left stays in a `member` list. Apply
 * them here, so the row goes as soon as the leave lands.
 */
const matchesQuery = (community: Amity.Community, membership: Membership) => {
  if (community.isDeleted) return false;
  if (membership === 'member') return !!community.isJoined;
  if (membership === 'notMember') return !community.isJoined;
  return true;
};

export const useCommunities = ({
  categoryId,
  membership = 'member',
  limit = 20,
}: {
  membership?: Membership;
  categoryId?: string;
  limit?: number;
} = {}) => {
  const [communities, setCommunities] = useState<Amity.Community[]>();
  const [loading, setLoading] = useState(true);
  const [onNextCommunityPage, setOnNextCommunityPage] =
    useState<() => void | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Re-subscribe to the collection, refetching it from the server.
   *
   * The current list stays on screen until the refetch lands, which is why
   * the data is filtered with matchesQuery: without it a community the user
   * just left showed for that long before dropping out.
   */
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  useEffect(() => {
    const unsubscribe = CommunityRepository.getCommunities(
      { membership, limit, categoryId },
      ({ error, loading, data, hasNextPage, onNextPage }) => {
        if (error) return;
        if (!loading) {
          setCommunities(data.filter((c) => matchesQuery(c, membership)));
          setOnNextCommunityPage(() => {
            if (hasNextPage) return onNextPage;
            return null;
          });
        }

        setLoading(loading);
      }
    );
    return unsubscribe;
  }, [categoryId, membership, limit, reloadKey]);

  return { communities, onNextCommunityPage, loading, refresh };
};
