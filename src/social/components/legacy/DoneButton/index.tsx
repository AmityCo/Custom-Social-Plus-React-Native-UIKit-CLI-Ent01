import {
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useStyles } from './styles';
import { Text } from '../../../../core/components/Text';
export default function DoneButton({
  onDonePressed,
  buttonTxt,
}: {
  navigation: any;
  buttonTxt?: string;
  onDonePressed: { (event: GestureResponderEvent): void };
}) {
  const buttonText = buttonTxt ?? 'Done';
  const styles = useStyles();
  return (
    <TouchableOpacity onPress={onDonePressed}>
      <View style={styles.icon}>
        <Text allowFontScaling={false} style={styles.doneText}>
          {buttonText}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
