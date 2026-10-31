import { NativeModules } from 'react-native';

/**
 * The uri to upload for a picked photo: an upright copy when the photo relies
 * on its EXIF orientation tag, otherwise the photo itself.
 *
 * Phones store a portrait photo with sideways pixels and a tag saying how to
 * turn them. The server keeps both as they are, so the photo shows sideways in
 * any viewer that ignores the tag. An upright copy shows the same everywhere.
 *
 * Falls back to the original when the app was not rebuilt with the UIKit's
 * native code yet, or when the copy cannot be made, so an upload never fails
 * because of this.
 */
export async function getUprightImageUri(uri: string): Promise<string> {
  const normalize: ((uri: string) => Promise<string>) | undefined =
    NativeModules.AmityReactNativeSocialUiKit?.normalizeImageOrientation;
  if (!normalize) return uri;

  try {
    return (await normalize(uri)) || uri;
  } catch {
    return uri;
  }
}
