import { FileRepository } from '@amityco/ts-sdk-react-native';
import { Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { ERROR_CODE } from '../constants';
import { appendFileToFormData } from '../utils/fileUpload';

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
    onProgress,
    altText,
  }: UploadSingleImageParams) => {
    const formData = new FormData();
    const parts = file.split('/');
    const fileName = parts[parts.length - 1];

    // Attach the file as a React-Native { uri, name, type } multipart part.
    // This works on both the Old and New (Bridgeless) Architecture and is what
    // the SDK's uploadImage expects (it reads files[0].name for preferredFilename).
    appendFileToFormData(formData, 'files', file, fileName, 'image/jpeg');

    console.log('[AmityUpload] 3. start', { file, fileName });

    try {
      const result = await mutateAsync(
        {
          file: formData,
          onProgress: (percent: number) => {
            console.log('[AmityUpload] 4. progress', percent);
            onProgress?.(percent);
          },
          altText,
        },
        {
          onError: (error) => {
            console.log('[AmityUpload] 5. error', { error });
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

      console.log('[AmityUpload] 5. success', result?.data?.[0]?.fileId);
      return result;
    } catch (error: any) {
      console.log('[AmityUpload] 5. error', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        // React Native puts the native Android error text here - this is where
        // "Stream Closed" shows up. It is not in error.message.
        nativeResponse: error?.request?._response,
        data: error?.response?.data,
      });
      throw error;
    }
  };

  return {
    uploadImage,
    isImageUploading: isPending,
  };
}
