import { PostRepository } from '@amityco/ts-sdk-react-native';
import { useLiveCollection } from '../useLiveCollection';

type UseSearchPostWithHashtagCollectionParams = Parameters<
  typeof PostRepository.searchPostsByHashtag
>[0];

export function useSearchPostWithHashtagCollection({
  hashtags,
  limit = 20,
  enabled = true,
  ...params
}: UseSearchPostWithHashtagCollectionParams & { enabled?: boolean }) {
  const { items, ...rest } = useLiveCollection({
    fetcher: PostRepository.searchPostsByHashtag,
    params: { hashtags, limit, ...params },
    enabled: enabled && hashtags.length > 0,
  });

  return { ...rest, posts: items };
}
