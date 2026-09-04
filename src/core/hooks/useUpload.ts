import { FileRepository } from '@amityco/ts-sdk-react-native';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ERROR_CODE } from '../constants';
import {
  appendFileToFormData,
  normalizeUploadPercent,
  resolveImageMimeType,
} from '../utils/fileUpload';
import {
  logUpload,
  platformContext,
  probeUploadHosts,
  serializeUploadError,
  startUploadWatchdog,
} from '../utils/uploadDebugLog';

type UploadImageResponse = Awaited<
  ReturnType<typeof FileRepository.uploadImage>
>;

type UploadImageParams = Parameters<typeof FileRepository.uploadImage>;

type UploadImagePayload = {
  file: UploadImageParams[0];
  onProgress?: UploadImageParams[1];
  altText?: UploadImageParams[2];
};

type UploadSingleImageParams = {
  file: string;
  /** MIME type reported by the picker; falls back to the file extension. */
  mimeType?: string;
  onProgress?: UploadImagePayload['onProgress'];
  altText?: UploadImagePayload['altText'];
};

export function useUpload() {
  const { mutateAsync, isPending } = useMutation<
    UploadImageResponse,
    Error,
    UploadImagePayload
  >({
    mutationFn: ({ file, onProgress, altText }) =>
      FileRepository.uploadImage(file, onProgress, altText),
  });

  const uploadImage = async ({
    file,
    mimeType,
    onProgress,
    altText,
  }: UploadSingleImageParams) => {
    // PDT-4769: log BEFORE any work — if anything below throws, `2. start`
    // has already recorded the exact input.
    logUpload('2. start', { file, ...platformContext() });

    const startedAt = Date.now();
    let lastProgress = -1; // -1 = no progress event ever fired
    let stage: 'build-formdata' | 'request' = 'build-formdata';
    // The request runs with no axios timeout — without a watchdog, a request
    // that never resolves is the one failure mode with no terminal log line.
    const stopWatchdog = startUploadWatchdog(() => lastProgress);

    try {
      const formData = new FormData();
      const parts = file.split('/');
      const fileName = parts[parts.length - 1];

      // Attach the file as a React-Native { uri, name, type } multipart part.
      // This works on both the Old and New (Bridgeless) Architecture and is what
      // the SDK's uploadImage expects (it reads files[0].name for preferredFilename).
      appendFileToFormData(
        formData,
        'files',
        file,
        fileName,
        resolveImageMimeType(fileName, mimeType)
      );

      stage = 'request';
      const result = await mutateAsync(
        {
          file: formData,
          onProgress: (rawPercent: number) => {
            // The SDK can report >100 (its `total` under-counts the bytes
            // sent), so clamp before anything renders it. `raw` stays in the
            // log because the unclamped value is what identifies the cause.
            const percent = normalizeUploadPercent(rawPercent);
            lastProgress = percent;
            logUpload('4. progress', { percent, raw: rawPercent });
            onProgress?.(percent);
          },
          altText,
        },
        {
          // Alerts only — the catch below is the SINGLE '5. error' log site.
          // (Logging the raw error object here serialised config.headers and
          // put the Authorization bearer token into logcat.)
          onError: (error) => {
            if (
              error.message.includes(ERROR_CODE.INVALID_IMAGE) ||
              error.message.includes(ERROR_CODE.VIOLENCE)
            ) {
              Alert.alert(
                'Inappropriate image',
                'Please choose a different image to upload.',
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert('Upload failed', 'Please try again.', [
                { text: 'OK' },
              ]);
            }
          },
        }
      );

      logUpload('5. success', {
        fileId: result?.data?.[0]?.fileId,
        ms: Date.now() - startedAt,
        lastProgress,
      });
      return result;
    } catch (error: any) {
      // `lastProgress` on the error line itself: -1 = body never streamed
      // (died before/at request build or connect); 1-99 = died mid-body;
      // 100 = body fully written once, then failed (the OkHttp-retry /
      // "Stream Closed" signature).
      logUpload(
        '5. error',
        serializeUploadError(error, {
          stage,
          lastProgress,
          ms: Date.now() - startedAt,
        })
      );
      // Fire-and-forget reachability probes for the proxy/allowlist
      // hypothesis, captured at the moment of failure. Never delays the throw.
      probeUploadHosts('after-upload-error').catch(() => {});
      throw error;
    } finally {
      stopWatchdog();
    }
  };

  return {
    uploadImage,
    isImageUploading: isPending,
  };
}
