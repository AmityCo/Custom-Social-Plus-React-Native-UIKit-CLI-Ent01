import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    badge: {
      overflow: 'hidden',
      borderRadius: 160,
      paddingVertical: 2,
      paddingHorizontal: 6,
      color: theme.colors.white,
      backgroundColor: theme.colors.transparentBlack,
    },
  });

  return { styles, theme };
};
