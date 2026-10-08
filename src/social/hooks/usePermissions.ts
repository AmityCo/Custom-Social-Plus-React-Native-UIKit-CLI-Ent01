import { PermissionsAndroid, Platform } from 'react-native';
import { logUpload } from '../../core/utils/uploadDebugLog';

export const useCameraPermission = () => {
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Already granted (e.g. a previous session) — don't re-prompt, which on
        // some devices/host setups resolves to a non-GRANTED result and makes
        // the camera flow appear denied. Check first, then request only if
        // needed.
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        if (alreadyGranted) {
          logUpload('0. permission', { camera: 'already-granted' });
          return true;
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        // PDT-4769: log the RAW result string — 'granted' | 'denied' |
        // 'never_ask_again'. 'never_ask_again' means the user (or an MDM
        // policy) permanently blocked the permission: the decisive detail a
        // boolean loses.
        logUpload('0. permission', { camera: granted });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        // If the request path throws (host-specific permission setups), fall
        // back to a plain check rather than hard-failing the camera flow.
        try {
          const fallback = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.CAMERA
          );
          logUpload('0. permission', {
            camera: fallback,
            requestThrew: (err as any)?.message,
          });
          return fallback;
        } catch (checkErr) {
          logUpload('0. permission', {
            camera: 'unknown',
            requestThrew: (err as any)?.message,
            checkThrew: (checkErr as any)?.message,
          });
          return false;
        }
      }
    }
    logUpload('0. permission', { camera: 'ios-delegated-to-plist' });
    return true; // iOS handles permissions automatically through Info.plist
  };

  const getCameraPermission = async () => {
    const permission = await requestCameraPermission();
    return permission;
  };

  return { getCameraPermission };
};
