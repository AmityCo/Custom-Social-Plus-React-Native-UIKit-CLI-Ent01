import { FlatList } from 'react-native';
import Divider from '../../../../components/Divider';
import NoResult from '../../../../components/NoResult';
import PostFeedSkeleton from '../../../../components/PostFeedSkeleton';
import AmityPostContentComponent from '../../../post/components/Content';
import { AmityPostContentComponentStyleEnum } from '../../../../enums/AmityPostContentComponentStyle';
import { PageID } from '../../../../enums';
import { usePostSearchResult } from './hooks/usePostSearchResult';
import { useStyles } from './styles';

type PostSearchResultProps = {
  keyword: string;
  pageId?: PageID;
};

export function PostSearchResult({
  keyword,
  pageId = PageID.WildCardPage,
}: PostSearchResultProps) {
  const styles = useStyles();
  const {
    isExcluded,
    accessibilityId,
    posts,
    isSearching,
    isEmpty,
    onEndReached,
  } = usePostSearchResult({ keyword, pageId });

  if (isExcluded) return null;

  return (
    <FlatList
      testID={accessibilityId}
      accessibilityLabel={accessibilityId}
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.postId}
      renderItem={({ item, index }) => (
        <>
          {index !== 0 && <Divider />}
          <AmityPostContentComponent
            post={item}
            AmityPostContentComponentStyle={
              AmityPostContentComponentStyleEnum.feed
            }
          />
        </>
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListFooterComponent={
        isSearching ? (
          <>
            {posts.length > 0 && <Divider />}
            <PostFeedSkeleton />
          </>
        ) : null
      }
      ListEmptyComponent={isEmpty ? <NoResult style={styles.empty} /> : null}
    />
  );
}
