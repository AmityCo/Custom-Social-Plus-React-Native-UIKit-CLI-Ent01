import { StyleSheet } from 'react-native';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = (theme: MyMD3Theme) => {
  const styles = StyleSheet.create({
    title: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      color: theme.colors.baseShade1,
      backgroundColor: theme.colors.background,
    },
  });

  return { styles, theme };
};
