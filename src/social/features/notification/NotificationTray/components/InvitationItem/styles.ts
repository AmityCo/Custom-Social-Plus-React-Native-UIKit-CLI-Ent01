import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { transparentize } from 'polished';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

const AVATAR_SIZE = 32;
const CONTENT_GAP = 12;
const HORIZONTAL_PADDING = 16;

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
    },
    unseen: {
      backgroundColor: transparentize(0.8, theme.colors.primary),
    },
    content: {
      gap: CONTENT_GAP,
      padding: HORIZONTAL_PADDING,
      flexDirection: 'row',
      alignItems: 'center',
    },
    leading: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
    },
    description: {
      flex: 1,
    },
    timestamp: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.baseShade2,
    },
    // Lined up under the text, past the avatar.
    actions: {
      gap: 8,
      flexDirection: 'row',
      paddingBottom: HORIZONTAL_PADDING,
      paddingRight: HORIZONTAL_PADDING,
      paddingLeft: HORIZONTAL_PADDING + AVATAR_SIZE + CONTENT_GAP,
    },
    action: {
      flex: 1,
    },
  });

  return { styles, theme };
};
