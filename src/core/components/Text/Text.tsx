import { Text as RNText, StyleSheet, TextProps } from 'react-native';
import { useFontFamily } from '../../providers/FontProvider';

/**
 * The UIKit's Text.
 *
 * Behaves exactly like React Native's `Text`, with two additions:
 *
 * - applies the host's configured font family for the style's `fontWeight`
 *   (see AmityFontConfig). Without a font config it changes nothing.
 * - defaults `allowFontScaling` to false so a style's `fontSize` is what gets
 *   measured and drawn. Callers can still pass it explicitly.
 *
 * Setting the family matters most in native hosts: when the host theme defines
 * a global typeface and the UIKit declares none, the font used to render can
 * differ from the one React Native measured with, and text gets clipped.
 */
export function Text({ style, allowFontScaling = false, ...props }: TextProps) {
  const resolveFontFamily = useFontFamily();

  if (!resolveFontFamily) {
    return (
      <RNText {...props} allowFontScaling={allowFontScaling} style={style} />
    );
  }

  const fontFamily = resolveFontFamily(StyleSheet.flatten(style)?.fontWeight);

  return (
    <RNText
      {...props}
      allowFontScaling={allowFontScaling}
      style={fontFamily ? [style, { fontFamily }] : style}
    />
  );
}

export default Text;
