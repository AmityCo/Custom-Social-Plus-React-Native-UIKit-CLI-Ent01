import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComponentID, PageID } from '../../../../../enums';
import { useAmityComponent } from '../../../../../hooks';
import {
  useSearchPostWithHashtagCollection,
  useSemanticSearchPostCollection,
} from '../../../../../hooks/collections';

const SEARCH_DEBOUNCE_MS = 300;

// Same as iOS: the feed card can't show file, audio or mixed-media posts.
const isSupportedPost = (post: Amity.Post) =>
  post.structureType !== 'mixed' &&
  !post.childrenPosts?.some(
    (child) => child.dataType === 'file' || child.dataType === 'audio'
  );

type UsePostSearchResultParams = {
  keyword: string;
  pageId: PageID;
};

export function usePostSearchResult({
  keyword,
  pageId,
}: UsePostSearchResultParams) {
  const componentId = ComponentID.post_search_result;
  const { isExcluded, accessibilityId } = useAmityComponent({
    pageId,
    componentId,
  });

  const trimmedKeyword = keyword.trim();
  const [query, setQuery] = useState(trimmedKeyword);

  useEffect(() => {
    const timeout = setTimeout(
      () => setQuery(trimmedKeyword),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timeout);
  }, [trimmedKeyword]);

  const isHashtagSearch = query.length > 1 && query.startsWith('#');

  const semanticSearch = useSemanticSearchPostCollection({
    query,
    matchingOnlyParentPost: true,
    enabled: !isHashtagSearch,
  });
  const hashtagSearch = useSearchPostWithHashtagCollection({
    hashtags: isHashtagSearch ? [query.slice(1)] : [],
    targetType: 'all',
    matchingOnlyParentPost: true,
    enabled: isHashtagSearch,
  });
  const { posts, hasMore, loadMore, isLoading, isLoadingFirstPage } =
    isHashtagSearch ? hashtagSearch : semanticSearch;

  // Results for the previous keyword stay hidden until the new search starts.
  const isTyping = trimmedKeyword !== query;
  const isSearching =
    !!trimmedKeyword && (isTyping || isLoading || isLoadingFirstPage);

  const searchResult = useMemo(
    () => (!query || isTyping ? [] : posts.filter(isSupportedPost)),
    [isTyping, posts, query]
  );

  const isEmpty = !!query && !isSearching && searchResult.length === 0;

  const onEndReached = useCallback(() => {
    if (hasMore && !isSearching) loadMore();
  }, [hasMore, isSearching, loadMore]);

  return {
    isExcluded,
    accessibilityId,
    query,
    posts: searchResult,
    isSearching,
    isEmpty,
    onEndReached,
  };
}
