import { Modal, TouchableOpacity, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Button } from '../../../../../components/Button';
import { Typography } from '../../../../../../core/components/Typography/Typography';
import { check, copy } from '../../../../../../core/assets/icons';
import { useStyles } from './styles';

type IntellectualPropertyDialogProps = {
  visible: boolean;
  title: string;
  description: string;
  contentIdLabel: string;
  contentId: string;
  copyLabel: string;
  isCopied: boolean;
  continueLabel: string;
  cancelLabel: string;
  descriptionId?: string;
  copyButtonId?: string;
  continueButtonId?: string;
  onCopy: () => void;
  /** Without it there is no Continue button: the guest copies and closes. */
  onContinue?: () => void;
  onCancel: () => void;
  /** iOS only: called once the dialog has finished dismissing. */
  onDismiss?: () => void;
};

// Its own Modal, rendered inside the report sheet's: iOS presents it from the
// sheet, so it covers the whole screen rather than only the sheet.
export function IntellectualPropertyDialog({
  visible,
  title,
  description,
  contentIdLabel,
  contentId,
  copyLabel,
  isCopied,
  continueLabel,
  cancelLabel,
  descriptionId,
  copyButtonId,
  continueButtonId,
  onCopy,
  onContinue,
  onCancel,
  onDismiss,
}: IntellectualPropertyDialogProps) {
  const { styles, theme } = useStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <Typography.TitleBold style={styles.title}>
            {title}
          </Typography.TitleBold>
          <Typography.Caption testID={descriptionId} style={styles.description}>
            {description}
          </Typography.Caption>
          <Typography.CaptionBold style={styles.contentIdLabel}>
            {contentIdLabel}
          </Typography.CaptionBold>
          <View style={styles.contentIdBox}>
            {/* Never truncated: the guest has to read or paste all of it. On a
                narrow screen it wraps instead. */}
            <Typography.Caption selectable style={styles.contentId}>
              {contentId}
            </Typography.Caption>
            <TouchableOpacity
              testID={copyButtonId}
              style={styles.copyButton}
              hitSlop={8}
              onPress={onCopy}
              accessibilityRole="button"
              accessibilityLabel={`${copyLabel} ${contentIdLabel}`}
            >
              <SvgXml
                xml={isCopied ? check(theme.colors.primary) : copy()}
                width={16}
                height={16}
                color={theme.colors.primary}
              />
              <Typography.CaptionBold style={styles.copyLabel}>
                {copyLabel}
              </Typography.CaptionBold>
            </TouchableOpacity>
          </View>
          {onContinue && (
            <Button
              testID={continueButtonId}
              style={styles.continueButton}
              accessibilityLabel={continueLabel}
              onPress={onContinue}
            >
              {/* Not a plain string: Button keeps a string to one line, and
                  this label is long enough to need two. */}
              <Typography.BodyBold style={styles.continueLabel}>
                {continueLabel}
              </Typography.BodyBold>
            </Button>
          )}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              !onContinue && styles.cancelButtonAlone,
            ]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Typography.BodyBold style={styles.cancelLabel}>
              {cancelLabel}
            </Typography.BodyBold>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
