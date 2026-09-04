import { memo, useCallback } from 'react';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import useConfig from '../../../../../hooks/useConfig';
import { useCapabilities, useUiKitConfig } from '../../../../../hooks';
import { useStyles } from './styles/styles';
import { useBehaviour } from '../../../../../providers/BehaviourProvider';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../../../../core/routes/RouteParamList';
import { Text } from '../../../../../../core/components/Text';

const CreateCommunityButton = () => {
  const { excludes } = useConfig();
  // Community creation is restricted to global admins (see useCapabilities).
  const { canCreateCommunity } = useCapabilities();
  const styles = useStyles();
  const navigation =
    useNavigation() as NativeStackNavigationProp<RootStackParamList>;
  const { AmityEmptyNewsFeedComponent } = useBehaviour();
  const [text] = useUiKitConfig({
    keys: ['text'],
    page: PageID.social_home_page,
    component: ComponentID.empty_newsfeed,
    element: ElementID.create_community_button,
  }) as string[];

  const onPressCreateCommunity = useCallback(() => {
    if (AmityEmptyNewsFeedComponent.onPressCreateCommunity)
      return AmityEmptyNewsFeedComponent.onPressCreateCommunity();
    navigation.navigate('CreateCommunity');
  }, [AmityEmptyNewsFeedComponent, navigation]);

  if (!canCreateCommunity) return null;

  if (
    excludes.includes('social_home_page/empty_newsfeed/create_community_button')
  )
    return null;

  return (
    <Text
      allowFontScaling={false}
      style={styles.createCommunityBtnText}
      onPress={onPressCreateCommunity}
    >
      {text ?? 'Create Community'}
    </Text>
  );
};

export default memo(CreateCommunityButton);
