import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme() as MyMD3Theme;
  const styles = StyleSheet.create({
    icon: {
      width: 160,
      height: 160,
    },
    // title / description stretch to the full container width and centre their
    // text, rather than hugging it. A text box sized exactly to its content has
    // no slack: if the text renders even slightly wider than it measured it
    // wraps, and the extra line is clipped by the height already computed for
    // one line - which is how "...create your own" lost "own" in brownfield
    // hosts. With the full width available there is nothing to wrap into.
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.baseShade3,
      marginVertical: 5,
      alignSelf: 'stretch',
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    description: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.baseShade3,
      alignSelf: 'stretch',
      textAlign: 'center',
      paddingHorizontal: 16,
    },
    exploreBtn: {
      // Was a rigid width: '60%', which left the label nothing to expand into
      // on narrower screens or when the text rendered wider than measured.
      minWidth: '60%',
      maxWidth: '90%',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 4,
      marginVertical: 17,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    exploreIcon: {
      width: 20,
      height: 20,
    },
    exploreText: {
      color: '#fff',
      fontSize: 15,
      marginLeft: 8,
      // Keep the label on one line and let the button grow to fit it, rather
      // than wrapping into a second line the button has no height for.
      flexShrink: 0,
    },
    createCommunityBtnText: {
      color: theme.colors.primary,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '400',
      alignSelf: 'stretch',
      textAlign: 'center',
      paddingHorizontal: 16,
    },
  });

  return styles;
};
