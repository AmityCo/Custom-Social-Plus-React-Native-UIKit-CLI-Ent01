import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { transparentize } from 'polished';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

const LEADING_SIZE = 32;

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    container: {
      gap: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    unseen: {
      backgroundColor: transparentize(0.8, theme.colors.primary),
    },
    leading: {
      width: LEADING_SIZE,
      height: LEADING_SIZE,
    },
    avatar: {
      width: LEADING_SIZE,
      height: LEADING_SIZE,
      borderRadius: LEADING_SIZE / 2,
    },
    communityPlaceholder: {
      width: LEADING_SIZE,
      height: LEADING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: LEADING_SIZE / 2,
      backgroundColor: theme.colors.primaryShade2,
    },
    eventCover: {
      width: LEADING_SIZE,
      height: LEADING_SIZE,
      borderRadius: 6,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    eventContext: {
      gap: 4,
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'center',
    },
    eventDateTime: {
      color: theme.colors.baseShade2,
    },
    timestamp: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.baseShade2,
    },
    skeleton: {
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    skeletonDetails: {
      flex: 1,
      gap: 8,
    },
  });

  return { styles, theme };
};
