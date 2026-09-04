import { useState } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  launchImageLibrary,
  ImageLibraryOptions,
  launchCamera,
  CameraOptions,
} from 'react-native-image-picker';
import { isValidImageType } from '../utils';
import { useCameraPermission } from './usePermissions';
import { deleteAmityFile } from '../../core/legacy/file';
import { useUpload } from '../../core/hooks';
import {
  logPickerResult,
  logUpload,
  serializeUploadError,
} from '../../core/utils/uploadDebugLog';

export type UseImagePickerResponse = {
  progress: number;
  isLoading: boolean;
  imageUri: string | null;
  removeSelectedImage: () => void;
  uploadedImage: Amity.File<'image'> | null;
  openCamera: (options: CameraOptions) => Promise<void | Amity.File<'image'>>;
  openImageGallery: (
    options: ImageLibraryOptions
  ) => Promise<void | Amity.File<'image'>>;
};

// PDT-4769: informational only — on Android 13+ the system photo picker needs
// NO permission, so `gallery: false` on API 33+ is not necessarily blocking.
// On API <= 32 a denied READ_EXTERNAL_STORAGE can produce empty or unreadable
// picker results, which IS a candidate cause. check() never prompts.
const logGalleryPermission = async () => {
  if (Platform.OS !== 'android') return;
  try {
    const api = Number(Platform.Version);
    const permission =
      api >= 33
        ? (PermissionsAndroid.PERMISSIONS as Record<string, string>)
            .READ_MEDIA_IMAGES ?? 'android.permission.READ_MEDIA_IMAGES'
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.check(permission as never);
    logUpload('0. permission', { gallery: granted, androidApi: api });
  } catch (err) {
    logUpload('0. permission', {
      gallery: 'check-threw',
      error: (err as any)?.message,
    });
  }
};

const useImagePicker = (): UseImagePickerResponse => {
  const { getCameraPermission } = useCameraPermission();
  const [progress, setProgress] = useState<number>(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] =
    useState<Amity.File<'image'> | null>(null);
  const { uploadImage, isImageUploading } = useUpload();

  const uploadFileToAmity = async (path: string, mimeType?: string) => {
    try {
      setImageUri(path);
      const { data } = await uploadImage({
        file: path,
        mimeType,
        onProgress: setProgress,
      });
      setUploadedImage(data[0]);
      setProgress(0);
      return data[0];
    } catch (error) {
      // PDT-4769: explicit fields only — the raw axios error serialises
      // config.headers and leaked the bearer token into logcat.
      logUpload('6. swallowed, returning null', serializeUploadError(error));
      return null;
    } finally {
      setProgress(0);
    }
  };

  const openImageGallery = async (options: ImageLibraryOptions) => {
    await logGalleryPermission();
    const result = await launchImageLibrary(options);
    // PDT-4769: logs EVERY outcome (asset, cancel, errorCode) — a silent
    // return below is now impossible to confuse with "picker never ran".
    logPickerResult('gallery', result);

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      if (!isValidImageType(result.assets[0]?.type)) {
        logUpload('1. rejected', {
          reason: 'invalid-image-type',
          type: result.assets[0]?.type,
        });
        return Alert.alert(
          'Unsupported image type',
          'Please upload a PNG or JPG image.',
          [{ text: 'OK' }]
        );
      }
      return uploadFileToAmity(result.assets[0]?.uri, result.assets[0]?.type);
    }
  };

  const openCamera = async (options: CameraOptions) => {
    const cameraPermission = await getCameraPermission();
    if (!cameraPermission) {
      // PDT-4769: ties a denied permission to the visible "nothing happened,
      // Settings opened" behaviour.
      logUpload('0. permission', { camera: false, action: 'opening-settings' });
      return Linking.openSettings();
    }

    const result = await launchCamera(options);
    logPickerResult('camera', result);

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      if (!isValidImageType(result.assets[0]?.type)) {
        logUpload('1. rejected', {
          reason: 'invalid-image-type',
          type: result.assets[0]?.type,
        });
        return Alert.alert(
          'Unsupported image type',
          'Please upload a PNG or JPG image.',
          [{ text: 'OK' }]
        );
      }
      return uploadFileToAmity(result.assets[0]?.uri, result.assets[0]?.type);
    }
  };

  const removeSelectedImage = () => {
    setProgress(0);
    setImageUri(null);
    setUploadedImage(null);
    deleteAmityFile(uploadedImage?.fileId);
  };

  return {
    isLoading: isImageUploading,
    imageUri,
    progress,
    uploadedImage,
    removeSelectedImage,
    openImageGallery,
    openCamera,
  };
};

export default useImagePicker;
