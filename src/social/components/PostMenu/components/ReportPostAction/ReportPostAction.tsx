import { View } from 'react-native';
import Skeleton from '../../../../../core/components/Skeleton/Skeleton';
import { report, unreport } from '../../../../../core/assets/icons';
import MenuAction from '../../../../elements/MenuAction/MenuAction';
import { useFlagPost } from '../../../../hooks';
import { useStyles } from './styles';

type ReportPostActionProps = {
  postId: string;
  onReport: () => void;
  onUnreport: () => void;
};

/**
 * "Report post" or "Unreport post", decided when the menu opens. This mounts
 * with the menu's content and asks the server whether the post is already
 * reported, like the web UIKit. Until it knows, a placeholder row holds the
 * place, so neither action can be tapped on an out-of-date answer.
 */
export function ReportPostAction({
  postId,
  onReport,
  onUnreport,
}: ReportPostActionProps) {
  const styles = useStyles();
  const { isFlaggedByMe, isChecking } = useFlagPost({ postId });

  if (isChecking) {
    return (
      <View style={styles.placeholder} accessible accessibilityLabel="Loading">
        <Skeleton.Circle width={24} height={24} />
        <Skeleton.Line width={96} height={12} />
      </View>
    );
  }

  return isFlaggedByMe ? (
    <MenuAction
      gap="small"
      label="Unreport post"
      iconProps={{ xml: unreport() }}
      onPress={onUnreport}
    />
  ) : (
    <MenuAction
      gap="small"
      label="Report post"
      iconProps={{ xml: report() }}
      onPress={onReport}
    />
  );
}
