import { useCallback, useEffect, useState } from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import * as Progress from 'react-native-progress';
import { SvgXml } from 'react-native-svg';
import { deleteAmityFile, uploadImageFile } from '../../../core/legacy/file';
import { closeIcon, toastIcon } from '../../../core/assets/icons/xml';
import { useStyles } from './styles';

interface OverlayImageProps {
  source: string;
  onClose?: (originalPath: string, field?: string, postId?: string) => void;
  onLoadFinish?: (
    fileId: string,
    fileUrl: string,
    fileName: string,
    index: number,
    originalPath: string
  ) => void;
  onUploadError?: (hasError: boolean, source: string) => void;
  index?: number;
  isUploaded: boolean;
  fileId?: string;
  isEditMode?: boolean;
  fileCount?: number;
  postId?: string;
  setIsUploading?: (arg: boolean) => void;
}
const LoadingImage = ({
  source,
  onClose,
  index,
  onLoadFinish,
  onUploadError,
  isUploaded = false,
  fileId = '',
  isEditMode = false,
  fileCount,
  postId,
  setIsUploading,
}: OverlayImageProps) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isProcess, setIsProcess] = useState<boolean>(false);
  const [isUploadError, setIsUploadError] = useState(false);
  const [isProgressTrusted, setIsProgressTrusted] = useState(true);
  const styles = useStyles();

  // Indeterminate until there is trustworthy, non-zero progress to show. At 0%
  // Progress.Circle draws a thin unfilled outline with no motion, which reads
  // as a broken indicator - the spinner is the honest state while we still know
  // nothing. Also covers the tail (isProcess), where the bytes are sent and the
  // server is still working.
  const showDeterminate = isProgressTrusted && progress > 0 && !isProcess;
  const handleLoadEnd = useCallback(() => {
    setLoading(false);
    setIsUploading(false);
  }, [setIsUploading]);

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
      const file: Amity.File<any>[] = await uploadImageFile(
        source,
        handleProgress
      );
      if (file) {
        setIsProcess(false);
        handleLoadEnd();
        onLoadFinish &&
          onLoadFinish(
            file[0]?.fileId as string,
            (file[0]?.fileUrl + '?size=medium') as string,
            file[0]?.attributes.name as string,
            index as number,
            source
          );
      } else {
        setIsUploading(false);
        handleLoadEnd();
        setIsProcess(false);
        setIsUploadError(true);
        onUploadError?.(true, source);
      }
    } catch (error) {
      handleLoadEnd();
      setIsProcess(false);
      setIsUploading(false);
      setIsUploadError(true);
      onUploadError?.(true, source);
    }
  }, [
    handleLoadEnd,
    handleProgress,
    index,
    onLoadFinish,
    onUploadError,
    setIsUploading,
    source,
  ]);

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
  }, [isUploaded, source]);

  const onRetryUpload = () => {
    uploadFileToAmity();
  };
  return (
    <View style={fileCount >= 3 ? styles.image3XContainer : styles.container}>
      <Image
        source={{ uri: source }}
        resizeMode="contain"
        style={[
          styles.image,
          loading ? styles.loadingImage : styles.loadedImage,
        ]}
      />
      {loading && (
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
      )}
      {!loading && isUploadError && (
        <View style={styles.failedOverlay}>
          <TouchableOpacity style={styles.errorOverlay} onPress={onRetryUpload}>
            <SvgXml xml={toastIcon()} width="28" height="28" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.closeButton}
        disabled={(loading || isProcess) && !isUploadError}
        onPress={handleDelete}
      >
        <SvgXml xml={closeIcon('white')} width="12" height="12" />
      </TouchableOpacity>
    </View>
  );
};
export default LoadingImage;
