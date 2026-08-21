import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MyMD3Theme } from '../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();
  const styles = StyleSheet.create({
    chipContainer: {
      backgroundColor: theme.colors.baseShade4,
      paddingHorizontal: 6,
      borderRadius: 20,
      // Shrink only when the row actually runs out of space, instead of being
      // held to a fixed share of it. Combined with dropping the percentage
      // maxWidth in CommunityCategories, a badge now keeps its full label
      // whenever the row can fit it.
      flexShrink: 1,
    },
    chipText: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.base,
    },
  });
  return { styles, theme };
};
