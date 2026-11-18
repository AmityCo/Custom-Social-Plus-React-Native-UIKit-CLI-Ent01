import { StyleSheet } from 'react-native';

export const useStyles = () => {
  return StyleSheet.create({
    // The same box as a MenuAction row (gap "small"), so nothing in the menu
    // moves when the real row replaces it.
    placeholder: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  });
};
