import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { transparentize } from 'polished';
import type { MyMD3Theme } from '../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme() as MyMD3Theme;

  const styles = StyleSheet.create({
    mentionText: {
      color: theme.colors.primary,
      fontSize: 15,
    },
    inputText: {
      color: theme.colors.base,
      fontSize: 15,
    },
    bold: {
      fontWeight: '600',
    },
    keywordHighlight: {
      fontWeight: '600',
      backgroundColor: transparentize(
        0.9,
        theme.colors.primaryShade1 ?? theme.colors.primary
      ),
    },
    moreLessButton: {
      fontWeight: 'normal',
      color: theme.colors.primary,
      fontSize: 15,
    },
  });

  return styles;
};
