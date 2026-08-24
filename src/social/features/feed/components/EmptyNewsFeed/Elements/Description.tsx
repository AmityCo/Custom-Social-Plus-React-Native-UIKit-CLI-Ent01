import { memo } from 'react';
import { ComponentID, ElementID, PageID } from '../../../../../enums';
import useConfig from '../../../../../hooks/useConfig';
import { useUiKitConfig } from '../../../../../hooks';
import { useStyles } from './styles/styles';
import { Text } from '../../../../../../core/components/Text';

const Description = () => {
  const { excludes } = useConfig();
  const styles = useStyles();
  const title = useUiKitConfig({
    keys: ['text'],
    page: PageID.social_home_page,
    component: ComponentID.empty_newsfeed,
    element: ElementID.description,
  }) as string[];

  if (excludes.includes('social_home_page/empty_newsfeed/description'))
    return null;
  return (
    <Text allowFontScaling={false} style={styles.description}>
      {title[0]}
    </Text>
  );
};

export default memo(Description);
