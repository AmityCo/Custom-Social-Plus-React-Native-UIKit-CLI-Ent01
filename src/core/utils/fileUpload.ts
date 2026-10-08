/**
 * fileUpload.ts
 *
 * Helper for attaching a local file to a FormData for upload to the Amity SDK.
 *
 * Why the `{ uri, name, type }` object (and NOT a Blob)
 * -----------------------------------------------------
 * React Native's `FormData.getParts()` only turns a value into a multipart
 * *file* part when that value is an object carrying a `uri`:
 *
 *   • `name` → the `filename` in the `Content-Disposition` header
 *   • `type` → the part's `Content-Type`
 *   • `uri`  → the local path the native networking layer streams bytes from
 *
 * This is the canonical React Native upload pattern and works on BOTH the Old
 * and the New (Bridgeless / JSI) Architecture — RN 0.83 did not change this JS
 * API. The Amity SDK's `uploadImage` is built around it too: it calls
 * `formData.getAll('files')` and reads `files[0].name` to set
 * `preferredFilename`.
 *
 * Do NOT append a Blob here. A Blob produced by `fetch(uri).blob()` has:
 *   • no `uri`            → RN attaches no file body, so the request carries no
 *                           bytes and the server responds `400 "No files
 *                           uploaded."`
 *   • no top-level `name` → `files[0].name` is `null`, so `preferredFilename`
 *                           is sent as `null`.
 * That combination is exactly the failure seen in PDT-3461.
 */

import { Platform } from 'react-native';

import mime from 'mime';

import { logUpload } from './uploadDebugLog';

// PDT-4769: the part's Content-Type is what the upload host validates against
// the actual bytes, so a PNG labelled as JPEG is rejected. Prefer the type the
// picker reported (on Android it comes from the ContentResolver), then the file
// extension, then JPEG so an unrecognised image is never blocked outright.
export function resolveImageMimeType(
  fileNameOrUri: string,
  reported?: string
): string {
  const normalised = reported?.toLowerCase();

  // Some Android pickers report `image/jpg`, which is not a real MIME type.
  if (normalised === 'image/jpg') return 'image/jpeg';
  if (normalised?.startsWith('image/')) return normalised;

  // `mime` returns null for an extensionless path or a `content://` uri, and a
  // non-image type for a misnamed file — neither is usable as an image part.
  const fromExtension = mime.getType(fileNameOrUri);
  return fromExtension?.startsWith('image/') ? fromExtension : 'image/jpeg';
}

/**
 * Append a local file to `formData` as a React-Native multipart file part.
 *
 * @param formData   The FormData instance to mutate.
 * @param fieldName  The multipart field name (e.g. `'files'`).
 * @param fileUri    Local file URI (`file://…` or `content://…`).
 * @param fileName   The filename sent in the Content-Disposition header.
 * @param mimeType   MIME type for the part (e.g. `'image/jpeg'`).
 */
/**
 * Upload progress callback.
 *
 * `percent` is clamped to 0-100 and is what UI should render. `raw` is what the
 * SDK actually reported, so a caller can tell a trustworthy progress stream
 * from one that overshoots - see normalizeUploadPercent for why that happens.
 * A determinate progress control should fall back to an indeterminate one as
 * soon as `raw` leaves the 0-100 range, and will start working on its own once
 * the SDK reports honest totals.
 */
export type UploadProgressCallback = (percent: number, raw: number) => void;

/**
 * Clamp an upload percentage reported by the SDK to a usable 0-100.
 *
 * The SDK computes `Math.round(loaded * 100 / total)` from the XHR upload
 * progress event, and on Android `total` comes back smaller than the bytes
 * actually sent - measured values for one image were 0, 0, 47, 106, 177, 188.
 * Passing that straight to a progress ring drives it past full, and an exact
 * `=== 100` completion check never matches, so callers get stuck showing a
 * determinate bar that never resolves.
 *
 * Non-finite values (a `total` of 0 yields Infinity/NaN) collapse to 0.
 */
export function normalizeUploadPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function appendFileToFormData(
  formData: FormData,
  fieldName: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): void {
  // Android keeps the URI as-is (`content://` / `file://` are both streamable);
  // iOS expects the `file://` scheme stripped to a bare path.
  const uri =
    Platform.OS === 'android' ? fileUri : fileUri.replace('file://', '');

  logUpload('3. append', { fileUri, uri, fileName, mimeType });

  // RN's FormData.append is typed for the legacy `{ uri, name, type }` object
  // but its TS types don't expose that overload, so we cast to `any`.
  formData.append(fieldName, {
    uri,
    name: fileName,
    type: mimeType,
  } as any);
}
