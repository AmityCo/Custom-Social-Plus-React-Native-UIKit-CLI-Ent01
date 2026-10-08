import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../../../core/providers/AmityUIKitProvider';

export const useStyle = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    // The feed's card look comes from white posts separated by 8px dividers in
    // the same grey. Without that grey on the list itself, everything past the
    // last post is white and the last post loses its bottom edge - so the
    // background has to match the divider colour.
    feedWrap: {
      flex: 1,
      height: '100%',
      backgroundColor: theme.colors.baseShade4,
    },
    // Padding belongs on the content, not the list's own style: on a ScrollView
    // `style` padding insets the viewport, leaving a band that never scrolls.
    feedContent: {
      paddingBottom: 50,
    },
  });
  return styles;
};
