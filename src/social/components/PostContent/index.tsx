import { Fragment, memo, useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useStyles } from './styles';
import useAuth from '../../../core/hooks/useAuth';
import { IVideoPost, MediaUri } from '../legacy/Social/PostList';
import { getPostById } from '../../../core/legacy/feed';
import ImageView from '../legacy/react-native-image-viewing/dist';
import { RootState, useUIKitSelector } from '../../../core/stores/store';
import { playBtn } from '../../../core/assets/icons/xml';
import { LinkPreview } from '../PreviewLink';
import RenderTextWithMention from '../RenderTextWithMention/RenderTextWithMention';
import { IMentionPosition } from '../../../core/types';
import PollContent from '../PollContent';
import { reportSwallowed } from '../../../core/errorReporter';
import { Text } from '../../../core/components/Text';

interface IPostContent {
  post: Amity.Post;
  textPost?: string;
  disabledPoll?: boolean;
  childrenPosts: string[];
  onPressPost?: () => void;
  showedAllOptions?: boolean;
  mentionPositionArr?: IMentionPosition[];
}
const PostContent: React.FC<IPostContent> = ({
  post,
  textPost,
  onPressPost,
  disabledPoll,
  childrenPosts,
  showedAllOptions,
  mentionPositionArr,
}) => {
  const isSameList = (a: string[], b: string[]) =>
    a.length === b.length && a.every((item, i) => item === b[i]);
  const videoKey = (video: IVideoPost) => video.videoFileId.original;
  const pollKey = (poll: { pollId: string }) => poll.pollId;

  const { apiRegion } = useAuth();
  const [imagePosts, setImagePosts] = useState<string[]>([]);
  const [videoPosts, setVideoPosts] = useState<IVideoPost[]>([]);
  const [pollIds, setPollIds] = useState<{ pollId: string }[]>([]);

  const [imagePostsFullSize, setImagePostsFullSize] = useState<MediaUri[]>([]);
  const [videoPostsFullSize, setVideoPostsFullSize] = useState<MediaUri[]>([]);
  const [visibleFullImage, setIsVisibleFullImage] = useState<boolean>(false);
  const [imageIndex, setImageIndex] = useState<number>(0);

  const styles = useStyles();
  let imageStyle: any = styles.imageLargePost;
  let colStyle: any = styles.col2;
  const { currentPostdetail } = useUIKitSelector(
    (state: RootState) => state.postDetail
  );
  const { postList: postListGlobal } = useUIKitSelector(
    (state: RootState) => state.globalFeed
  );
  const { postList } = useUIKitSelector((state: RootState) => state.feed);

  useEffect(() => {
    setImagePostsFullSize([]);
    setVideoPostsFullSize([]);
    if (imagePosts.length > 0) {
      const updatedUrls: MediaUri[] = imagePosts.map((url: string) => {
        return {
          uri: url.replace('size=medium', 'size=large'),
        };
      });
      setImagePostsFullSize(updatedUrls);
    }
    if (videoPosts.length > 0) {
      const updatedUrls: MediaUri[] = videoPosts.map((item: IVideoPost) => {
        return {
          uri: `https://api.${apiRegion}.amity.co/api/v3/files/${item?.thumbnailFileId}/download?size=large`,
        };
      });
      setVideoPostsFullSize(updatedUrls);
    }
  }, [imagePosts, videoPosts, apiRegion]);

  // The ids, not the array: every post update (a reaction, a new comment's
  // count) hands down a new `children` array with the same ids.
  const childrenKey = (childrenPosts ?? []).join(',');

  const getPostInfo = useCallback(
    async (isStale: () => boolean) => {
      try {
        const response = await Promise.all(
          (childrenKey ? childrenKey.split(',') : []).map(async (id) => {
            const { data: childrenPost } = await getPostById(id);
            return {
              dataType: childrenPost?.dataType,
              data: childrenPost?.data,
            };
          })
        );

        const images: string[] = [];
        const videos: IVideoPost[] = [];
        const polls: { pollId: string }[] = [];

        response.forEach((item) => {
          if (item?.dataType === 'image' && item?.data?.fileId) {
            const url: string = `https://api.${apiRegion}.amity.co/api/v3/files/${item?.data.fileId}/download?size=medium`;
            if (!images.includes(url)) {
              images.push(url);
            }
          } else if (
            item?.dataType === 'video' &&
            item?.data?.videoFileId.original
          ) {
            const isExisted = videos.some(
              (video) =>
                video.videoFileId.original === item.data.videoFileId.original
            );
            if (!isExisted) {
              videos.push(item.data);
            }
          } else if (item?.dataType === 'poll') {
            if (!polls.some((poll) => poll.pollId === item.data.pollId)) {
              polls.push(item.data);
            }
          }
        });

        if (isStale()) return;
        // Swap in the new media only when it differs, keeping the same array
        // otherwise, so the mounted images are left alone. Set even when empty,
        // so media removed from the post is cleared.
        setImagePosts((prev) => (isSameList(prev, images) ? prev : images));
        setVideoPosts((prev) =>
          isSameList(prev.map(videoKey), videos.map(videoKey)) ? prev : videos
        );
        setPollIds((prev) =>
          isSameList(prev.map(pollKey), polls.map(pollKey)) ? prev : polls
        );
      } catch (error) {
        reportSwallowed('PostContent', error);
      }
    },
    [apiRegion, childrenKey]
  );

  // Re-checks the media on the same triggers as before, but no longer clears it
  // first: clearing unmounted the images, so the post's media blanked and
  // collapsed on every post update - e.g. for the whole time a new comment was
  // sending - until the refetch put them back.
  useEffect(() => {
    let stale = false;
    getPostInfo(() => stale);
    return () => {
      stale = true;
    };
  }, [currentPostdetail, postList, postListGlobal, getPostInfo]);

  function onClickImage(index: number): void {
    setIsVisibleFullImage(true);
    setImageIndex(index);
  }

  function renderMediaPosts() {
    const thumbnailFileIds: string[] =
      videoPosts.length > 0
        ? videoPosts.map((item) => {
            return `https://api.${apiRegion}.amity.co/api/v3/files/${item?.thumbnailFileId}/download?size=medium`;
          })
        : [];
    const mediaPosts =
      [...imagePosts].length > 0 ? [...imagePosts] : [...thumbnailFileIds];
    const imageElement = mediaPosts.map((item: string, index: number) => {
      if (mediaPosts.length === 1) {
        imageStyle = styles.imageLargePost;
        colStyle = styles.col6;
      } else if (mediaPosts.length === 2) {
        colStyle = styles.col3;
        if (index === 0) {
          imageStyle = [styles.imageLargePost, styles.imageMarginRight];
        } else {
          imageStyle = [styles.imageLargePost, styles.imageMarginLeft];
        }
      } else if (mediaPosts.length === 3) {
        switch (index) {
          case 0:
            colStyle = styles.col6;
            imageStyle = [styles.imageMediumPost, styles.imageMarginBottom];
            break;
          case 1:
            colStyle = styles.col3;
            imageStyle = [
              styles.imageMediumPost,
              styles.imageMarginTop,
              styles.imageMarginRight,
            ];
            break;
          case 2:
            colStyle = styles.col3;
            imageStyle = [
              styles.imageMediumPost,
              styles.imageMarginTop,
              styles.imageMarginLeft,
            ];
            break;

          default:
            break;
        }
      } else {
        switch (index) {
          case 0:
            colStyle = styles.col6;
            imageStyle = [
              styles.imageMediumLargePost,
              styles.imageMarginBottom,
            ];
            break;
          case 1:
            colStyle = styles.col2;
            imageStyle = [
              styles.imageSmallPost,
              styles.imageMarginTop,
              styles.imageMarginRight,
            ];
            break;
          case 2:
            colStyle = styles.col2;
            imageStyle = [
              styles.imageSmallPost,
              styles.imageMarginTop,
              styles.imageMarginLeft,
              styles.imageMarginRight,
            ];
            break;
          case 3:
            colStyle = styles.col2;
            imageStyle = [
              styles.imageSmallPost,
              styles.imageMarginTop,
              styles.imageMarginLeft,
            ];
            break;
          default:
            break;
        }
      }

      return (
        <View style={colStyle} key={item}>
          <TouchableWithoutFeedback onPress={() => onClickImage(index)}>
            <View>
              {videoPosts.length > 0 && renderPlayButton()}
              <Image
                style={imageStyle}
                source={{
                  uri: item,
                }}
              />
              {index === 3 && imagePosts.length > 4 && (
                <View style={styles.overlay}>
                  <Text
                    allowFontScaling={false}
                    style={styles.overlayText}
                  >{`+ ${imagePosts.length - 3}`}</Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      );
    });
    if (imageElement.length < 3) {
      return (
        <View style={styles.imagesWrap}>
          <View style={styles.row}>{imageElement}</View>
        </View>
      );
    } else if (imageElement.length === 3) {
      return (
        <View style={[styles.imagesWrap]}>
          <View style={styles.row}>{imageElement.slice(0, 1)}</View>
          <View style={styles.row}>{imageElement.slice(1, 3)}</View>
        </View>
      );
    } else {
      return (
        <View style={styles.imagesWrap}>
          <View style={styles.row}>{imageElement.slice(0, 1)}</View>
          <View style={styles.row}>{imageElement.slice(1, 4)}</View>
        </View>
      );
    }
  }

  function renderPlayButton() {
    return (
      <View style={styles.playButton}>
        <SvgXml xml={playBtn} width="50" height="50" />
      </View>
    );
  }

  function renderImageHeader({ imageIndex: imgIndex }) {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.flexWidth}>
          <TouchableOpacity
            style={styles.closebtnIcon}
            onPress={() => setIsVisibleFullImage(false)}
          >
            <Text allowFontScaling={false} style={styles.closeBtn}>
              X
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.flexWidth}>
          <Text allowFontScaling={false} style={styles.header}>
            {imgIndex + 1}/
            {imagePostsFullSize.length || videoPostsFullSize.length}
          </Text>
        </View>
        <View style={styles.flexWidth} />
      </View>
    );
  }

  return (
    <Fragment>
      <Pressable onPress={onPressPost}>
        {textPost && childrenPosts?.length === 0 && (
          <LinkPreview
            text={textPost}
            mentionPositionArr={[...mentionPositionArr]}
          />
        )}
        {textPost && childrenPosts?.length > 0 && (
          <RenderTextWithMention
            textPost={textPost}
            mentionPositionArr={[...mentionPositionArr]}
          />
        )}
      </Pressable>
      {pollIds.length > 0 ? (
        <PollContent
          post={post}
          pollId={pollIds[0].pollId}
          disabledPoll={disabledPoll}
          showedAllOptions={showedAllOptions}
        />
      ) : (
        renderMediaPosts()
      )}
      <ImageView
        images={
          imagePostsFullSize.length > 0
            ? imagePostsFullSize
            : videoPostsFullSize
        }
        imageIndex={imageIndex}
        visible={visibleFullImage}
        onRequestClose={() => setIsVisibleFullImage(false)}
        isVideoButton={videoPosts.length > 0 ? true : false}
        videoPosts={videoPosts}
        HeaderComponent={renderImageHeader}
      />
    </Fragment>
  );
};

export default memo(PostContent);
