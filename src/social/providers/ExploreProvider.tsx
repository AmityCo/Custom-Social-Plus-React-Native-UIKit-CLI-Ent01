// ExploreContext.tsx
import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';

import {
  useRecommendedCommunities,
  useTrendingCommunities,
  useCategories,
  usePinnedCommunities,
  EXPLORE_PINNED_TAG,
} from '../hooks';
import { onVisitorAutoJoinCompleted } from '../../core/stores/pendingVisitorJoin';
import useAuth from '../../core/hooks/useAuth';
import { joinCommunityWithRetry } from '../../core/utils/joinCommunityWithRetry';

interface ExploreContextType {
  refresh: () => void;
  onJoinRecommendedCommunity: (communityId: string) => void;
  recommendedCommunities: Amity.Community[];
  trendingCommunities: Amity.Community[];
  pinnedCommunities: Amity.Community[];
  categories: Amity.Category[];
  isCategoryEmpty: boolean;
  isRecommendedCommunitiesEmpty: boolean;
  isTrendingCommunitiesEmpty: boolean;
  isPinnedCommunitiesEmpty: boolean;
  isLoading: boolean;
  isAllError: boolean;
  isAllCommunitiesError: boolean;
  hasMoreCategories: boolean;
}

const ExploreContext = createContext<ExploreContextType | undefined>(undefined);

export const ExploreProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Visitor/bot sessions are read-only and cannot join communities, so the
  // auto-join below must not run for them (every call would fail with a
  // permission error). Signed-in users only.
  const { isVisitorOrBot } = useAuth();

  // Community ids already attempted this session. The pinned query is a live
  // collection, so it re-emits on any change; without this the effect would
  // re-fire joins that are still in flight.
  const attemptedJoinsRef = useRef<Set<string>>(new Set());

  const {
    onJoinCommunity: onJoinRecommendedCommunity,
    refresh: refreshRecommendedCommunities,
    communities: recommendedCommunities,
    loading: isLoadingRecommendedCommunities,
    error: recommendedCommunitiesError,
  } = useRecommendedCommunities();

  const {
    refresh: refreshTrendingCommunities,
    communities: trendingCommunitiesRaw,
    loading: isLoadingTrendingCommunities,
    error: trendingCommunitiesError,
  } = useTrendingCommunities();

  const {
    refresh: refreshPinnedCommunities,
    communities: pinnedCommunities,
    loading: isLoadingPinnedCommunities,
  } = usePinnedCommunities();

  // Every user is auto-joined to pinned communities, so they'd naturally qualify
  // for Trending (high join velocity) and show up in both places. The trending
  // API has no server-side "exclude by tag" param, so we over-fetch by 1 (limit
  // 6 in useTrendingCommunities) and drop any pinned-tagged community here on the
  // client, then cap at 5. If 2+ pinned communities are trending we may show
  // fewer than 5 — that's acceptable per spec (no padding / re-query).
  const trendingCommunities = trendingCommunitiesRaw
    ?.filter((community) => !community.tags?.includes(EXPLORE_PINNED_TAG))
    .slice(0, 5);

  const {
    refresh: refreshCategories,
    categories,
    loading: isLoadingCategories,
    hasMore: hasMoreCategories,
    error: categoriesError,
  } = useCategories();

  const refresh = () => {
    refreshRecommendedCommunities();
    refreshTrendingCommunities();
    refreshCategories();
    refreshPinnedCommunities();
  };

  // Auto-join every pinned community the user isn't already in. Runs off the
  // SAME query used to render the Pinned section (no second query). Fires in the
  // background — it does NOT block render (the section shows cards with their
  // current isJoined state immediately). Each join is isolated in its own
  // try/catch so one failure can't affect the others, and we intentionally do
  // not re-query/re-render after success (joined visuals update on next natural
  // refresh). Already-joined communities are skipped with no API call.
  useEffect(() => {
    // Skip entirely for visitors/bots — their read-only session can't join, so
    // every call would fail. Signed-in users only.
    if (isVisitorOrBot) return;
    if (!pinnedCommunities?.length) return;
    pinnedCommunities.forEach((community) => {
      if (community.isJoined) return;
      // Already attempted this session — don't re-fire on every re-render of
      // the pinned query. Without this, a live-collection update would restart
      // joins that are still in flight.
      if (attemptedJoinsRef.current.has(community.communityId)) return;
      attemptedJoinsRef.current.add(community.communityId);

      // Retries transient network failures; a single dropped request used to
      // leave the user silently un-joined with only a console error.
      joinCommunityWithRetry(community.communityId, {
        onFinalFailure: (err) => {
          console.error(
            `Auto-join failed for community ${community.communityId}:`,
            err
          );
          // Allow a later attempt (next mount / natural refresh) to try again.
          attemptedJoinsRef.current.delete(community.communityId);
        },
      });
    });
  }, [pinnedCommunities, isVisitorOrBot]);

  // The visitor auto-join (after sign-in) may complete AFTER Explore has
  // already loaded, leaving the just-joined community in the list. Re-fetch
  // when the auto-join finishes so the lists reflect the new join state.
  useEffect(() => {
    return onVisitorAutoJoinCompleted(() => {
      refreshRecommendedCommunities();
      refreshTrendingCommunities();
    });
  }, []);

  return (
    <ExploreContext.Provider
      value={{
        refresh,
        recommendedCommunities,
        trendingCommunities,
        pinnedCommunities,
        categories,
        isLoading:
          isLoadingCategories ||
          isLoadingRecommendedCommunities ||
          isLoadingTrendingCommunities ||
          isLoadingPinnedCommunities,
        isCategoryEmpty: !isLoadingCategories && categories?.length === 0,
        isRecommendedCommunitiesEmpty:
          !isLoadingRecommendedCommunities &&
          recommendedCommunities?.length === 0,
        isTrendingCommunitiesEmpty:
          !isLoadingTrendingCommunities && trendingCommunities?.length === 0,
        isPinnedCommunitiesEmpty:
          !isLoadingPinnedCommunities && pinnedCommunities?.length === 0,
        hasMoreCategories,
        isAllError:
          categoriesError &&
          recommendedCommunitiesError &&
          trendingCommunitiesError,
        isAllCommunitiesError:
          recommendedCommunitiesError && trendingCommunitiesError,
        onJoinRecommendedCommunity,
      }}
    >
      {children}
    </ExploreContext.Provider>
  );
};

export const useExplore = () => {
  const context = useContext(ExploreContext);
  if (context === undefined) {
    throw new Error('useExplore must be used within an ExploreProvider');
  }
  return context;
};
