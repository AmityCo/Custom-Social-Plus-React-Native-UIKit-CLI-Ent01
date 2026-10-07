import { useEffect, useRef, useState } from 'react';
import { CommunityRepository } from '@amityco/ts-sdk-react-native';
import useAuth from '../../core/hooks/useAuth';

// Communities tagged with this exact string are "pinned" — an admin-curated set
// featured at the top of Explore and auto-joined for every user. The tag is set
// server-side (via the community's `tags` field); the client only reads it.
export const EXPLORE_PINNED_TAG = 'explore-pinned';

// The SDK's getCommunities live collection prepends the community from every
// community event (joined, left, updated, created) to the collection, and does
// not re-apply the query's filters when it re-emits. Without this check, leaving
// any community put it into the pinned list - shown under the pinned section and
// auto-joined straight back by ExploreProvider.
const isPinned = (community: Amity.Community) =>
  !community.isDeleted && !!community.tags?.includes(EXPLORE_PINNED_TAG);

// Follows the same live-collection pattern as useTrendingCommunities /
// useRecommendedCommunities: subscribe to CommunityRepository.getCommunities and
// copy results into state, exposing a refresh() that re-subscribes.
export const usePinnedCommunities = () => {
  const { isConnected } = useAuth();
  const [communities, setCommunities] = useState<Amity.Community[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  const fetchPinnedCommunities = () => {
    setLoading(true);
    // SDK param is `includeDeleted` (not `isDeleted`); false = exclude deleted.
    return CommunityRepository.getCommunities(
      { tags: [EXPLORE_PINNED_TAG], includeDeleted: false },
      ({ error: err, loading: isLoading, data }) => {
        setLoading(isLoading);
        if (err) setError(err);
        if (!isLoading) {
          setCommunities(data?.filter(isPinned));
        }
      }
    );
  };

  const unsubscribeListener = () => {
    unsubscribersRef.current.forEach((unsubscriber) => unsubscriber());
    unsubscribersRef.current = [];
  };

  const refresh = () => {
    unsubscribeListener();
    setError(null);
    const unsubscribe = fetchPinnedCommunities();
    unsubscribersRef.current.push(unsubscribe);
  };

  useEffect(() => {
    if (!isConnected) return () => {};

    const unsubscribe = fetchPinnedCommunities();
    unsubscribersRef.current.push(unsubscribe);

    return () => unsubscribeListener();
  }, [isConnected]);

  return { communities, loading, error, refresh };
};
