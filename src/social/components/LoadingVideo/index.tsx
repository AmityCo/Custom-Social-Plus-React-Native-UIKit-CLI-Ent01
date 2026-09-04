import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  ImageStyle,
  Platform,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Progress from 'react-native-progress';
import { SvgXml } from 'react-native-svg';
import { deleteAmityFile, uploadVideoFile } from '../../../core/legacy/file';
import { closeIcon, playBtn, toastIcon } from '../../../core/assets/icons/xml';
import { useStyles } from './styles';
import Video from 'react-native-video';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import uiSlice from '../../../core/stores/slices/uiSlice';
import { createVideoThumbnail } from 'react-native-compressor';
import { useUIKitDispatch } from '../../../core/stores/store';

interface OverlayImageProps {
  source: string;
  onClose?: (originalPath: string, fileId?: string, postId?: string) => void;
  onLoadFinish?: (
    fileId: string,
    fileUrl: string,
    fileName: string,
    index: number,
    originalPath: string,
    thumbNail: string
  ) => void;
  onUploadError?: (hasError: boolean, source: string) => void;
  index?: number;
  isUploaded: boolean;
  fileId?: string;
  thumbNail: string;
  onPlay?: (fileUrl: string) => void;
  isEditMode?: boolean;
  fileCount?: number;
  postId?: string;
  setIsUploading?: (arg: boolean) => void;
}
const LoadingVideo = ({
  source,
  onClose,
  index,
  onLoadFinish,
  onUploadError,
  isUploaded = false,
  thumbNail,
  onPlay,
  fileId,
  isEditMode = false,
  fileCount,
  postId,
  setIsUploading,
}: OverlayImageProps) => {
  const dispatch = useUIKitDispatch();
  const { showToastMessage } = uiSlice.actions;
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isProcess, setIsProcess] = useState<boolean>(false);
  const [isUploadError, setIsUploadError] = useState(false);
  const [isProgressTrusted, setIsProgressTrusted] = useState(true);
  const [thumbNailImage, setThumbNailImage] = useState(thumbNail ?? '');
  const styles = useStyles();

  // Indeterminate until there is trustworthy, non-zero progress to show. At 0%
  // Progress.Circle draws a thin unfilled outline with no motion, which reads
  // as a broken indicator - the spinner is the honest state while we still know
  // nothing. Also covers the tail (isProcess), where the bytes are sent and the
  // server is still working.
  const showDeterminate = isProgressTrusted && progress > 0 && !isProcess;
  const [playingUri, setPlayingUri] = useState<string>('');
  const [isPause, setIsPause] = useState<boolean>(true);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const playVideoFullScreen = (fileUrl: string) => {
    if (Platform.OS === 'ios') {
      setPlayingUri(fileUrl);
    } else {
      setIsPause(true);
      navigation.navigate('VideoPlayer', { source: source });
    }
  };
  const onClosePlayer = () => {
    setIsPause(true);
    setPlayingUri('');
  };

  const handleLoadEnd = () => {
    setLoading(false);
    setIsUploading(false);
  };

  const processThumbNail = async () => {
    const generatedThumbNail = await createVideoThumbnail(source);
    setThumbNailImage(generatedThumbNail.path);
  };
  useEffect(() => {
    processThumbNail();
  }, [thumbNail]);

  // The SDK's `total` can under-count the bytes sent, so `raw` sometimes runs
  // past 100 (measured 0, 0, 47, 106, 177, 188 for one image). Progress.Circle
  // clamps to full internally, so an overshooting stream slams the ring to
  // 100% almost immediately - which reads as "no progress indicator at all".
  // The first out-of-range value therefore drops this upload to an
  // indeterminate spinner, which claims nothing it cannot deliver. Once the SDK
  // reports honest totals, `raw` stays in range and the determinate ring is
  // used again with no change here.
  const handleProgress = useCallback((percent: number, raw: number) => {
    if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
      setIsProgressTrusted(false);
    }
    setProgress(percent);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      setIsProcess(true);
    }
  }, [progress]);

  const uploadFileToAmity = useCallback(async () => {
    setIsUploading(true);
    setIsUploadError(false);
    try {
      const file: Amity.File<any>[] = await uploadVideoFile(
        source,
        handleProgress
      );
      if (file) {
        setIsProcess(false);
        handleLoadEnd();
        onLoadFinish &&
          onLoadFinish(
            file[0]?.fileId as string,
            file[0]?.fileUrl as string,
            file[0]?.attributes.name as string,
            index as number,
            source,
            thumbNail
          );
      } else {
        handleLoadEnd();
        dispatch(showToastMessage({ toastMessage: 'Failed to upload file' }));
        setIsProcess(false);
        setIsUploadError(true);
        onUploadError?.(true, source);
      }
    } catch (error) {
      handleLoadEnd();
      dispatch(showToastMessage({ toastMessage: 'Failed to upload file' }));
      setIsProcess(false);
      setIsUploadError(true);
      onUploadError?.(true, source);
    }
  }, [source]);

  const handleDelete = async () => {
    if (fileId && !isEditMode) {
      await deleteAmityFile(fileId);
    }
    onClose && onClose(source, fileId, postId);
  };
  useEffect(() => {
    setIsUploadError(false);
    onUploadError?.(false, source);
    setProgress(0);
    setIsProcess(false);
    setIsProgressTrusted(true);
    if (isUploaded) {
      setLoading(false);
    } else {
      uploadFileToAmity();
    }
  }, [fileId, isUploaded, source]);

  const handleOnPlay = () => {
    setIsPause(!isPause);
    playVideoFullScreen(source);
    onPlay && onPlay(source);
  };

  const onRetryUpload = () => {
    uploadFileToAmity();
  };

  return (
    <View style={fileCount >= 3 ? styles.image3XContainer : styles.container}>
      {!loading && !isUploadError && isPause && (
        <TouchableOpacity style={styles.playButton} onPress={handleOnPlay}>
          <SvgXml xml={playBtn} width="50" height="50" />
        </TouchableOpacity>
      )}
      {playingUri && !isPause ? (
        <Video
          controls
          style={styles.image}
          source={{ uri: playingUri }}
          onFullscreenPlayerWillDismiss={onClosePlayer}
          paused={isPause}
        />
      ) : thumbNailImage ? (
        <Image
          resizeMode="cover"
          source={{ uri: thumbNailImage }}
          style={[
            styles.image as ImageStyle,
            (loading ? styles.loadingImage : styles.loadedImage) as ImageStyle,
          ]}
        />
      ) : (
        <View style={styles.image} />
      )}

      {loading ? (
        <View style={styles.overlay}>
          {showDeterminate ? (
            <Progress.Circle
              progress={progress / 100}
              size={24}
              borderColor="transparent"
              unfilledColor="#ffffff"
              thickness={2}
            />
          ) : (
            <Progress.CircleSnail
              size={24}
              borderColor="transparent"
              thickness={2}
            />
          )}
        </View>
      ) : isUploadError ? (
        <TouchableOpacity style={styles.overlay} onPress={onRetryUpload}>
          <SvgXml xml={toastIcon()} width="24" height="24" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.closeButton}
          disabled={(loading || isProcess) && !isUploadError}
          onPress={handleDelete}
        >
          <SvgXml xml={closeIcon('white')} width="12" height="12" />
        </TouchableOpacity>
      )}
    </View>
  );
};
export default LoadingVideo;
