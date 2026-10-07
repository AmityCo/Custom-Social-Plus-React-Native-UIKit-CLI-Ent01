import { useCallback, useEffect, useState } from 'react';
import { CommunityRepository } from '@amityco/ts-sdk-react-native';

export const useCommunities = ({
  categoryId,
  membership = 'member',
  limit = 20,
}: {
  membership?: 'all' | 'member' | 'notMember';
  categoryId?: string;
  limit?: number;
} = {}) => {
  const [communities, setCommunities] = useState<Amity.Community[]>();
  const [loading, setLoading] = useState(true);
  const [onNextCommunityPage, setOnNextCommunityPage] =
    useState<() => void | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * Re-subscribe to the collection.
   *
   * The SDK's live collection does not drop a community from a `member` query
   * when the user leaves it, so the list keeps showing it until something tears
   * the subscription down - which previously only happened when the tab
   * remounted. Callers refresh on focus instead.
   */
  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);
  useEffect(() => {
    const unsubscribe = CommunityRepository.getCommunities(
      { membership, limit, categoryId },
      ({ error, loading, data, hasNextPage, onNextPage }) => {
        if (error) return;
        if (!loading) {
          setCommunities(data);
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
