import { ReactNode, createContext, useContext, useMemo } from 'react';
import type { TextStyle } from 'react-native';

/**
 * Font families for the UIKit's text.
 *
 * Without this, the UIKit sets no `fontFamily` at all and every `Text` falls
 * back to the platform default. That is fine in a standalone app, but in a
 * native host whose theme sets a global `android:fontFamily`, the rendered
 * typeface can differ from the one React Native measured with - text then needs
 * more width than its box was given and the last glyph (or, for multi-word
 * labels, the wrapped remainder) is clipped.
 *
 * Declaring the font explicitly makes React Native resolve the same typeface
 * for measurement and rendering, so the two agree.
 *
 * Android resolves each family name to a font file in `assets/fonts`, so fonts
 * shipped as one file per weight should be listed per weight:
 *
 * ```tsx
 * <AmityUiKitProvider
 *   fonts={{
 *     regular: 'ProximaNova-Regular',
 *     medium: 'ProximaNova-Medium',
 *     semiBold: 'ProximaNova-Semibold',
 *     bold: 'ProximaNova-Bold',
 *   }}
 * />
 * ```
 *
 * For a family that carries all weights in one file, `fontFamily` alone is
 * enough and React Native applies `fontWeight` on top of it.
 */
export interface AmityFontConfig {
  /** Used for any weight that has no more specific entry below. */
  fontFamily?: string;
  /** fontWeight 400 / 'normal'. */
  regular?: string;
  /** fontWeight 500. */
  medium?: string;
  /** fontWeight 600. */
  semiBold?: string;
  /** fontWeight 700 / 'bold'. */
  bold?: string;
  /** fontWeight 800 / 900. */
  extraBold?: string;
}

/** Resolves a style's fontWeight to the family that should render it. */
export type FontFamilyResolver = (
  fontWeight?: TextStyle['fontWeight']
) => string | undefined;

const FontContext = createContext<AmityFontConfig | undefined>(undefined);

export const FontProvider = ({
  children,
  fonts,
}: {
  children: ReactNode;
  fonts?: AmityFontConfig;
}) => <FontContext.Provider value={fonts}>{children}</FontContext.Provider>;

/**
 * Returns a resolver, or undefined when the host configured no fonts - in which
 * case the UIKit leaves `fontFamily` unset exactly as before.
 */
export const useFontFamily = (): FontFamilyResolver | undefined => {
  const fonts = useContext(FontContext);

  return useMemo(() => {
    if (!fonts) return undefined;
    const { fontFamily, regular, medium, semiBold, bold, extraBold } = fonts;
    if (
      !fontFamily &&
      !regular &&
      !medium &&
      !semiBold &&
      !bold &&
      !extraBold
    ) {
      return undefined;
    }

    return (fontWeight?: TextStyle['fontWeight']) => {
      switch (String(fontWeight ?? '400')) {
        case '900':
        case '800':
          return extraBold ?? bold ?? fontFamily;
        case 'bold':
        case '700':
          return bold ?? fontFamily;
        case '600':
          return semiBold ?? bold ?? fontFamily;
        case '500':
          return medium ?? fontFamily;
        default:
          return regular ?? fontFamily;
      }
    };
  }, [fonts]);
};
