import { View } from 'react-native';
import { Radio } from '../../../../../../core/components/Radio';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import CommunityPrivacyIcon from '../../../../../elements/CommunityPrivacyIcon';
import { PageID } from '../../../../../enums';
import { CommunityPrivacyOption } from '../../../../../types';
import { usePrivacyOptions } from './hooks/usePrivacyOptions';

type PrivacyOptionsProps = {
  value: CommunityPrivacyOption;
  onChange: (value: CommunityPrivacyOption) => void;
};

export function PrivacyOptions({ value, onChange }: PrivacyOptionsProps) {
  const { styles, label, options } = usePrivacyOptions();

  return (
    <View style={styles.container}>
      <Typography.TitleBold style={styles.label}>{label}</Typography.TitleBold>
      <Radio.Group value={value} onChange={onChange}>
        {options.map((option) => (
          <Radio.Option
            key={option.value}
            value={option.value}
            accessibilityLabel={option.title}
            style={() => styles.optionContainer}
          >
            <Radio.Label style={styles.labelContainer}>
              <CommunityPrivacyIcon
                iconProps={{ xml: option.icon }}
                pageId={PageID.community_setup_page}
                elementId={option.iconElementId}
              />
              <View style={styles.infoContainer}>
                <Typography.BodyBold style={styles.title}>
                  {option.title}
                </Typography.BodyBold>
                <Typography.Caption style={styles.description}>
                  {option.description}
                </Typography.Caption>
              </View>
            </Radio.Label>
            <Radio.Icon />
          </Radio.Option>
        ))}
      </Radio.Group>
    </View>
  );
}
