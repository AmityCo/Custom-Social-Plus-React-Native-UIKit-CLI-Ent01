import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      paddingBottom: 16 + insets.bottom,
    },
    sectionHeader: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      color: theme.colors.baseShade1,
      backgroundColor: theme.colors.background,
    },
    skeletonSection: {
      paddingBottom: 16,
    },
    skeletonHeader: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
  });

  return { styles, theme };
};
