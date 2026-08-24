import { TextProps } from 'react-native';
import { FC, memo } from 'react';
import { ComponentID, ElementID, PageID } from '../../enums/enumUIKitID';
import useConfig from '../../hooks/useConfig';
import { Text } from '../../../core/components/Text';

type TextElementType = Partial<TextProps> & {
  pageID?: PageID;
  componentID?: ComponentID;
  elementID: ElementID;
  text: string;
};

const TextElement: FC<TextElementType> = ({
  pageID = PageID.WildCardPage,
  componentID = ComponentID.WildCardComponent,
  elementID,
  text,
  ...props
}) => {
  const { excludes } = useConfig();
  const configId = `${pageID}/${componentID}/${elementID}`;
  if (excludes.includes(configId)) return null;
  return (
    <Text
      allowFontScaling={false}
      testID={configId}
      accessibilityLabel={configId}
      {...props}
    >
      {text}
    </Text>
  );
};

export default memo(TextElement);
