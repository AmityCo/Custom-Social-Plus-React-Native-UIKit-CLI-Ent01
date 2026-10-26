import { StyleSheet } from 'react-native';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = (theme: MyMD3Theme) => {
  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    text: {
      marginTop: 8,
      color: theme.colors.baseShade3,
    },
  });

  return { styles, theme };
};
