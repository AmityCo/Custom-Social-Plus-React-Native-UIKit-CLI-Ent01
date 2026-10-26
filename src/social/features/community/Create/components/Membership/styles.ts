import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    container: {
      gap: 16,
    },
    divider: {
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.baseShade4,
    },
    label: {
      color: theme.colors.base,
    },
    row: {
      gap: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    texts: {
      flex: 1,
      gap: 2,
    },
    description: {
      color: theme.colors.base,
    },
    subDescription: {
      color: theme.colors.baseShade1,
    },
  });

  return { styles, theme };
};
