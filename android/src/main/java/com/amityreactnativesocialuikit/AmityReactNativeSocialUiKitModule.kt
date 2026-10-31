package com.amityreactnativesocialuikit

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.concurrent.thread

class AmityReactNativeSocialUiKitModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  // Example method
  // See https://reactnative.dev/docs/native-modules-android
  @ReactMethod
  fun multiply(a: Double, b: Double, promise: Promise) {
    promise.resolve(a * b)
  }

  /**
   * Resolves an upright copy of a photo that relies on its EXIF orientation
   * tag, or the original uri when it needs none. A viewer that ignores the tag
   * shows such a photo sideways, so uploads must not depend on it.
   */
  @ReactMethod
  fun normalizeImageOrientation(uri: String, promise: Promise) {
    thread {
      val copy = try {
        uprightCopy(uri)
      } catch (e: Throwable) {
        null
      }
      promise.resolve(copy ?: uri)
    }
  }

  private fun uprightCopy(uri: String): String? {
    // ExifInterface reads from a stream only from Android 7.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return null

    val source = Uri.parse(if (uri.contains("://")) uri else "file://$uri")
    val resolver = reactApplicationContext.contentResolver

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(source)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outMimeType !in ROTATABLE_TYPES) return null

    val orientation = resolver.openInputStream(source)?.use {
      ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } ?: return null
    val matrix = orientationMatrix(orientation) ?: return null

    val longest = maxOf(bounds.outWidth, bounds.outHeight)
    var sampleSize = 1
    while (longest / sampleSize > MAX_PIXEL_SIZE) sampleSize *= 2
    val bitmap = resolver.openInputStream(source)?.use {
      BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sampleSize })
    } ?: return null

    val upright = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    val file = File(reactApplicationContext.cacheDir, "upright-${UUID.randomUUID()}.jpg")
    // Bitmap.compress writes no EXIF: the pixels are upright, so the copy needs no tag.
    FileOutputStream(file).use { upright.compress(Bitmap.CompressFormat.JPEG, 90, it) }
    if (upright !== bitmap) upright.recycle()
    bitmap.recycle()
    return Uri.fromFile(file).toString()
  }

  // Turns and mirrors the pixels back to upright for each EXIF orientation.
  private fun orientationMatrix(orientation: Int): Matrix? {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
        matrix.setRotate(180f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
      else -> return null
    }
    return matrix
  }

  companion object {
    const val NAME = "AmityReactNativeSocialUiKit"
    private const val MAX_PIXEL_SIZE = 4096
    private val ROTATABLE_TYPES = setOf("image/jpeg", "image/heic", "image/heif")
  }
}
