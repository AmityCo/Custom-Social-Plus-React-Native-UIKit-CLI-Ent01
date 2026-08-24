import { TouchableOpacity, View } from 'react-native';
import { useStyles } from './styles';
import { useNavigation } from '@react-navigation/native';
import { Text } from '../../../core/components/Text';

export default function CancelButton() {
  const navigation = useNavigation();
  const styles = useStyles();
  return (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <View style={styles.icon}>
        <Text allowFontScaling={false} style={styles.cancelText}>
          Cancel
        </Text>
      </View>
    </TouchableOpacity>
  );
}
