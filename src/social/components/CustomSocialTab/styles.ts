import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme() as MyMD3Theme;

  const styles = StyleSheet.create({
    tabContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      padding: 12,
    },
    tabBtn: {
      borderRadius: 24,
      // 8 here + 4 on tabName keeps the pill the same size as before, while
      // making the Text view itself wider than its glyphs (see tabName).
      paddingHorizontal: 8,
      paddingVertical: 8,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.colors.baseShade4,
      backgroundColor: theme.colors.background,
    },
    tabName: {
      fontSize: 17,
      lineHeight: 22,
      color: theme.colors.baseShade1,
      // Android clips a TextView's drawing to its own bounds, and the text is
      // laid out into (width - padding). This padding does not change where the
      // line breaks, but it does give a final glyph somewhere to land when it
      // renders wider than it measured - the cause of "Newsfee" / "Explor" in
      // brownfield hosts, where a single word cannot wrap out of trouble.
      paddingHorizontal: 4,
    },
  });
  return styles;
};
