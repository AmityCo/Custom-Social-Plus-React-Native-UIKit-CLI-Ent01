import { Typography } from '../../../../../../core/components/Typography/Typography';
import { useStyles } from './styles';

const EVENT_TYPE_LABEL: Record<string, string> = {
  in_person: 'In-person',
  virtual: 'Virtual',
};

type EventTypeBadgeProps = {
  type: Amity.EventType;
};

export function EventTypeBadge({ type }: EventTypeBadgeProps) {
  const { styles } = useStyles();
  const label = EVENT_TYPE_LABEL[type as string];

  if (!label) return null;

  return (
    <Typography.CaptionBold style={styles.badge}>
      {label}
    </Typography.CaptionBold>
  );
}
