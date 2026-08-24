import { ActivityIndicator, View } from 'react-native';
import { styles } from './styles';
import { Text } from '../../../../core/components/Text';

interface LoadingOverlayProps {
  isLoading: boolean;
  loadingText?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  loadingText,
}) => {
  if (!isLoading) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.indicatorContainer}>
        <ActivityIndicator size="large" color="#fff" />
        {loadingText && (
          <Text allowFontScaling={false} style={styles.loadingText}>
            {loadingText}
          </Text>
        )}
      </View>
    </View>
  );
};
