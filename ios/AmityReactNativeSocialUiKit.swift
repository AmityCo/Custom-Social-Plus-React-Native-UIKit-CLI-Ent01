import ImageIO

@objc(AmityReactNativeSocialUiKit)
class AmityReactNativeSocialUiKit: NSObject {

  @objc(multiply:withB:withResolver:withRejecter:)
  func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
    resolve(a*b)
  }

  /// Resolves an upright copy of a photo that relies on its EXIF orientation
  /// tag, or the original uri when it needs none. A viewer that ignores the tag
  /// shows such a photo sideways, so uploads must not depend on it.
  @objc(normalizeImageOrientation:withResolver:withRejecter:)
  func normalizeImageOrientation(uri: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) -> Void {
    DispatchQueue.global(qos: .userInitiated).async {
      resolve(AmityReactNativeSocialUiKit.uprightCopy(of: uri) ?? uri)
    }
  }

  private static let maxPixelSize = 4096
  private static let rotatableTypes: Set<String> = ["public.jpeg", "public.heic", "public.heif"]

  private static func uprightCopy(of uri: String) -> String? {
    let url: URL
    if uri.hasPrefix("file://") {
      url = URL(string: uri) ?? URL(fileURLWithPath: String(uri.dropFirst("file://".count)))
    } else {
      url = URL(fileURLWithPath: uri)
    }

    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let type = CGImageSourceGetType(source) as String?,
          rotatableTypes.contains(type),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue,
          orientation != 1,
          let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.intValue,
          let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.intValue
    else { return nil }

    // WithTransform turns the pixels the way the tag says.
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceThumbnailMaxPixelSize: min(max(width, height), maxPixelSize),
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else { return nil }

    let output = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("upright-\(UUID().uuidString).jpg")
    guard let destination = CGImageDestinationCreateWithURL(output as CFURL, "public.jpeg" as CFString, 1, nil) else { return nil }
    // No metadata is copied: the pixels are upright, so the copy needs no tag.
    CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.9] as CFDictionary)
    return CGImageDestinationFinalize(destination) ? output.absoluteString : nil
  }
}
