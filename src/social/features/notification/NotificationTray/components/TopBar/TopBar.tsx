import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../../../core/routes/RouteParamList';
import BackButton from '../../../../../elements/BackButton';
import Title from '../../../../../elements/Title';
import { ElementID, PageID } from '../../../../../enums';
import { useStyles } from './styles';

export function TopBar() {
  const { styles } = useStyles();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>
      <BackButton
        pageId={PageID.notification_tray_page}
        onPress={navigation.goBack}
      />
      <Title pageId={PageID.notification_tray_page} elementId={ElementID.title}>
        Notifications
      </Title>
      <View style={styles.dummy} />
    </View>
  );
}
