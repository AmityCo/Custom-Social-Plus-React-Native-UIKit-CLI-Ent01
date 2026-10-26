import { Switch, View } from 'react-native';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import { useMembership } from './hooks/useMembership';

type MembershipProps = {
  /** Whether a moderator has to approve join requests. */
  value: boolean;
  onChange: (value: boolean) => void;
  /** A section follows below, so this one ends in a divider. */
  hasDivider?: boolean;
};

export function Membership({ value, onChange, hasDivider }: MembershipProps) {
  const { styles, theme, label, description, subDescription } = useMembership();

  return (
    <View style={[styles.container, hasDivider && styles.divider]}>
      <Typography.TitleBold style={styles.label}>{label}</Typography.TitleBold>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Typography.BodyBold style={styles.description}>
            {description}
          </Typography.BodyBold>
          <Typography.Caption style={styles.subDescription}>
            {subDescription}
          </Typography.Caption>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={description}
          thumbColor={theme.colors.background}
          ios_backgroundColor={theme.colors.baseShade3}
          trackColor={{
            true: theme.colors.primary,
            false: theme.colors.baseShade3,
          }}
        />
      </View>
    </View>
  );
}
