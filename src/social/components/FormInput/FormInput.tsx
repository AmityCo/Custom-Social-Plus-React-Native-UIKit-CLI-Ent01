import { TextInput, TextInputProps, View } from 'react-native';
import { Typography } from '../../../core/components/Typography/Typography';
import FormLabel from '../../elements/FormLabel';
import { ElementID, PageID, ComponentID } from '../../enums';
import { useStyles } from './styles';

type FormInputProps = TextInputProps & {
  pageId?: PageID;
  maxLength?: number;
  elementId?: ElementID;
  componentId?: ComponentID;
  optional?: boolean;
  /** Shown in red under the field, which is outlined red too. */
  errorMessage?: string;
};

/***
 * category: Form
 * component: Input
 */

function FormInput({
  value,
  optional,
  maxLength,
  pageId = PageID.WildCardPage,
  elementId = ElementID.WildCardElement,
  componentId = ComponentID.WildCardComponent,
  editable = true,
  errorMessage,
  ...props
}: FormInputProps) {
  const { styles, theme } = useStyles();

  return (
    <View>
      <View
        style={[
          styles.inputContainer,
          !!errorMessage && styles.inputContainerError,
        ]}
      >
        <View style={styles.labelContainer}>
          <FormLabel
            optional={optional}
            pageId={pageId}
            elementId={elementId}
            componentId={componentId}
          />
          {maxLength && (
            <Typography.Caption style={styles.inputLength}>
              {value?.length}/{maxLength}
            </Typography.Caption>
          )}
        </View>
        <TextInput
          allowFontScaling={false}
          {...props}
          value={value}
          editable={editable}
          style={[styles.input, !editable && styles.inputDisabled]}
          maxLength={maxLength}
          placeholderTextColor={theme.colors.baseShade3}
        />
      </View>
      {!!errorMessage && (
        <Typography.Caption style={styles.errorText}>
          {errorMessage}
        </Typography.Caption>
      )}
    </View>
  );
}

export default FormInput;
