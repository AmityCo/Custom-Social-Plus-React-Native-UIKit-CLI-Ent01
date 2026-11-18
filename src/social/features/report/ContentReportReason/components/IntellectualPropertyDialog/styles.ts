import { Platform, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { MyMD3Theme } from '../../../../../../core/providers/AmityUIKitProvider';

export const useStyles = () => {
  const theme = useTheme<MyMD3Theme>();

  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      backgroundColor: theme.colors.transparentBlack,
    },
    card: {
      width: '100%',
      maxWidth: 320,
      padding: 20,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
    },
    title: {
      textAlign: 'center',
    },
    description: {
      marginTop: 8,
      textAlign: 'center',
      color: theme.colors.baseShade1,
    },
    contentIdLabel: {
      marginTop: 16,
      marginBottom: 6,
    },
    contentIdBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: theme.colors.baseShade4,
    },
    contentId: {
      flex: 1,
      marginRight: 8,
      // An ID is read and compared character by character.
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    copyLabel: {
      color: theme.colors.primary,
    },
    continueButton: {
      marginTop: 16,
    },
    continueLabel: {
      color: theme.colors.white,
      textAlign: 'center',
    },
    cancelButton: {
      marginTop: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    cancelLabel: {
      color: theme.colors.primary,
    },
  });

  return { styles, theme };
};
