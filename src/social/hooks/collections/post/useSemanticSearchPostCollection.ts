import { PostRepository } from '@amityco/ts-sdk-react-native';
import { useLiveCollection } from '../useLiveCollection';

type UseSemanticSearchPostCollectionParams = Parameters<
  typeof PostRepository.semanticSearchPosts
>[0];

export function useSemanticSearchPostCollection({
  query,
  limit = 20,
  enabled = true,
  ...params
}: UseSemanticSearchPostCollectionParams & { enabled?: boolean }) {
  const { items, ...rest } = useLiveCollection({
    fetcher: PostRepository.semanticSearchPosts,
    params: { query, limit, ...params },
    enabled: enabled && !!query,
  });

  return { ...rest, posts: items };
}
