import styles from './styles';
import { Text } from '../../../../core/components/Text';

interface CustomTextProps {
  children: React.ReactNode;
  style?: any;
  numberOfLines?: number;
  ellipsizeMode?: 'tail' | 'head' | 'middle' | 'clip' | undefined;
}

const CustomText: React.FC<CustomTextProps> = ({
  children,
  style,
  numberOfLines,
  ellipsizeMode = 'tail',
}) => {
  return (
    <Text
      allowFontScaling={false}
      style={[styles.text, style]}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
    >
      {children}
    </Text>
  );
};
export default CustomText;
