import { StyleSheet } from 'react-native';
import type { MyMD3Theme } from '../../../core/providers/AmityUIKitProvider';

// Same footprint as the header's search and create buttons: a 20px icon area
// with 4px padding.
const BUTTON_SIZE = 28;

export const useStyles = (theme: MyMD3Theme) => {
  const styles = StyleSheet.create({
    button: {
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      marginHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BUTTON_SIZE / 2,
      backgroundColor: theme.colors.baseShade4,
    },
    redDotWrapper: {
      top: -2,
      right: -2,
      padding: 2,
      borderRadius: 6,
      position: 'absolute',
      backgroundColor: theme.colors.background,
    },
    redDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.alert,
    },
  });

  return { styles, theme };
};
