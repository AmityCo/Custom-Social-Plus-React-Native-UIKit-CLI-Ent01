/**
 * uploadDebugLog.ts — PDT-4769 TEMPORARY diagnostic helpers. REVERT together
 * with the rest of the diagnostic PR once the Android upload failure is
 * identified.
 *
 * Every upload log line goes through logUpload() so that:
 *
 *   1. every line is SINGLE-LINE JSON — React Native prints raw objects across
 *      multiple logcat lines, and `adb logcat | grep AmityUpload` silently
 *      drops the continuation lines;
 *   2. payloads are explicit field allowlists — NEVER a raw axios error: its
 *      serialisation includes config.headers, i.e. the Authorization bearer
 *      token, and these logs are collected by the customer and sent back.
 *
 * Log sequence (a healthy upload prints 0..5 in order; every failure mode
 * prints SOMETHING — "no [AmityUpload] lines at all" now always means the
 * flow was never entered):
 *   0. permission   camera/gallery permission state, every branch
 *   1. picked       every picker outcome (success, cancel, native error)
 *   1. rejected     UIKit-side validation rejections after a pick
 *   2. start        upload entered (raw uri + platform)
 *   3. append       the {uri,name,type} handed to RN FormData
 *   4. progress     native body-write progress (0-100)
 *   5. success | 5. error   single terminal log per attempt
 *   6. swallowed    the error was caught and the flow returned null
 *   7. probe        post-failure reachability probes (proxy discriminator)
 *   8. hang         watchdog: no terminal event within the window
 */
import { Platform } from 'react-native';

export function logUpload(step: string, payload?: unknown): void {
  let body = '';
  if (payload !== undefined) {
    try {
      body = JSON.stringify(payload);
    } catch {
      body = String(payload);
    }
  }
  console.log(`[AmityUpload] ${step} ${body}`);
}

/** Platform context stamped once per upload attempt. */
export function platformContext() {
  return { os: Platform.OS, osVersion: Platform.Version };
}

/* Structural picker types so this core util doesn't import from
 * react-native-image-picker (a social-layer dependency). The real Asset /
 * ImagePickerResponse satisfy these shapes. */
type PickedAsset = {
  uri?: string;
  type?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  originalPath?: string;
};
type PickerResult = {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: PickedAsset[];
};

/** Explicit-field asset summary — never log the raw Asset (it can carry a full
 *  base64 body when a caller passes includeBase64). */
export function assetSummary(asset?: PickedAsset) {
  if (!asset) return undefined;
  return {
    uri: asset.uri,
    type: asset.type,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
    originalPath: asset.originalPath,
  };
}

/** ONE log for every picker outcome — success, cancel and native error all
 *  land here, so a permission denial or picker failure can never again be
 *  silent. errorCode ('permission' | 'camera_unavailable' | 'others') comes
 *  straight from react-native-image-picker. */
export function logPickerResult(source: string, result: PickerResult): void {
  logUpload('1. picked', {
    source,
    didCancel: result?.didCancel ?? false,
    errorCode: result?.errorCode,
    errorMessage: result?.errorMessage,
    assetCount: result?.assets?.length ?? 0,
    asset: assetSummary(result?.assets?.[0]),
  });
}

/** Serialise an upload error to SAFE explicit fields (no headers object → no
 *  bearer token). configContentType note for log readers: the SDK deliberately
 *  sends a BOUNDARY-LESS multipart/form-data and RN's native layer adds the
 *  boundary on the wire — a missing boundary here is EXPECTED, not the bug. */
export function serializeUploadError(
  error: any,
  extra?: Record<string, unknown>
) {
  return {
    ...extra,
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.response?.status,
    data: error?.response?.data,
    // RN puts the native Android error text ("Stream Closed") here — it is
    // NOT in error.message (which only ever says "Network Error").
    nativeResponse: error?.request?._response,
    requestReadyState: error?.request?.readyState,
    requestTimeout: error?.request?.timeout,
    configUrl: error?.config
      ? `${error.config.baseURL ?? ''}${error.config.url ?? ''}`
      : undefined,
    configContentType: readContentType(error?.config?.headers),
    // Did the body survive to the adapter as a real RN FormData?
    configDataType: error?.config?.data?.constructor?.name,
    configDataIsRnFormData: typeof error?.config?.data?.getParts === 'function',
  };
}

function readContentType(headers: any): string | undefined {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    try {
      const value = headers.get('Content-Type');
      if (value != null) return String(value);
    } catch {
      /* fall through to plain lookup */
    }
  }
  return headers['Content-Type'] ?? headers['content-type'];
}

/**
 * Post-failure reachability probes (PDT-4769 proxy discriminator).
 *
 * Every working API call goes to api.us.amity.co; the failing upload is the
 * ONLY call to upload.us.amity.co — a different hostname, which a proxy
 * allowlist can treat differently. ANY http status (401/403/404/405…) means
 * the host is reachable through the current network path, proxy included: the
 * failure is then specific to the multipart request itself. A status-less
 * failure on the upload host alone means host-level blocking — the error
 * message distinguishes which kind:
 *   "Unable to resolve host…"  = DNS
 *   SSL/handshake/trust text   = TLS interception vs the app's trust config
 *   plain "Network request failed" = connect refused / reset / allowlist drop
 * Response header NAMES (never values) are logged because interception
 * proxies inject identifiable headers (via, x-cache, x-bluecoat, …).
 */
export async function probeUploadHosts(reason: string): Promise<void> {
  await Promise.all([
    probeHost('upload-host', 'https://upload.us.amity.co/', reason),
    probeHost('api-host', 'https://api.us.amity.co/', reason),
  ]);
}

async function probeHost(
  label: string,
  url: string,
  reason: string
): Promise<void> {
  const startedAt = Date.now();
  try {
    const res = await fetch(url, { method: 'GET' });
    const headerNames: string[] = [];
    try {
      (res.headers as any)?.forEach?.((_value: string, key: string) => {
        headerNames.push(key);
      });
    } catch {
      /* Headers iteration unsupported on this runtime — names are optional */
    }
    logUpload('7. probe', {
      label,
      url,
      reason,
      status: res.status,
      ms: Date.now() - startedAt,
      via: res.headers?.get?.('via') ?? undefined,
      server: res.headers?.get?.('server') ?? undefined,
      xCache: res.headers?.get?.('x-cache') ?? undefined,
      headerNames,
    });
  } catch (err) {
    logUpload('7. probe', {
      label,
      url,
      reason,
      ms: Date.now() - startedAt,
      error: (err as any)?.message,
    });
  }
}

/**
 * Hang watchdog. The upload runs with no axios timeout, so a request that
 * never resolves (stalled proxy, half-open connection) was the ONE case that
 * produced no terminal log line at all. Cancelled on success and on error.
 */
export function startUploadWatchdog(
  getLastProgress: () => number,
  ms = 90000
): () => void {
  const timer = setTimeout(() => {
    logUpload('8. hang', {
      afterMs: ms,
      lastProgress: getLastProgress(),
      note: 'no success/error within the window - request likely stalled',
    });
  }, ms);
  return () => clearTimeout(timer);
}
