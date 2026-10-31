import { Linking, Text as RNText } from 'react-native';
import { useStyles } from './styles';
import { Fragment, memo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { IMentionPosition } from '../../../core/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../core/routes/RouteParamList';
import ReadMore from '@fawazahmed/react-native-read-more';
import { createUrlRegex } from '../../../core/constants';
import { Text } from '../../../core/components/Text';
import { useFontFamily } from '../../../core/providers/FontProvider';
import { splitByKeyword } from './utils/splitByKeyword';

interface IrenderTextWithMention {
  mentionPositionArr: IMentionPosition[];
  textPost: string;
  isTitle?: boolean;
  keyword?: string;
}

interface LinkInfo {
  link: string;
  index: number;
  length: number;
}

const RenderTextWithMention: React.FC<IrenderTextWithMention> = ({
  mentionPositionArr,
  textPost,
  isTitle,
  keyword,
}) => {
  const styles = useStyles();
  const resolveFontFamily = useFontFamily();
  const navigation =
    useNavigation() as NativeStackNavigationProp<RootStackParamList>;
  const linkArr = useCallback((text: string): LinkInfo[] => {
    const links: LinkInfo[] = [];
    const urlRegex = createUrlRegex();
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      links.push({
        link: match[0],
        index: match.index,
        length: match[0].length,
      });
    }
    return links;
  }, []);

  const heightlightTextPositions = [
    ...linkArr(textPost),
    ...mentionPositionArr,
  ].sort((a, b) => a.index - b.index) as (IMentionPosition & LinkInfo)[];

  const mentionClick = useCallback(
    (userId: string) => {
      navigation.navigate('UserProfile', {
        userId: userId,
      });
    },
    [navigation]
  );
  const handleLinkClick = useCallback(async (url: string) => {
    try {
      const hasProtocol = /^(https?|ftp|mailto):/.test(url);
      const formattedUrl = hasProtocol ? url : `https://${url}`;
      await Linking.openURL(formattedUrl);
    } catch (error) {
      console.warn('Failed to open URL:', error);
    }
  }, []);

  const handleOnClick = useCallback(
    (link: string, userId: string) => {
      if (link) return handleLinkClick(link);
      return mentionClick(userId);
    },
    [handleLinkClick, mentionClick]
  );

  // React Native's own Text, not the UIKit's: ReadMore drops any other
  // component from the text it cuts short.
  const renderText = (text: string) => {
    if (!keyword) return text;
    const highlightFont = resolveFontFamily?.(
      styles.keywordHighlight.fontWeight
    );
    return splitByKeyword(text, keyword).map((part, i) =>
      part.isMatch ? (
        <RNText
          key={`keyword-${i}`}
          allowFontScaling={false}
          style={[
            styles.keywordHighlight,
            highlightFont && { fontFamily: highlightFont },
          ]}
        >
          {part.text}
        </RNText>
      ) : (
        part.text
      )
    );
  };

  if (heightlightTextPositions.length === 0) {
    return (
      <ReadMore
        key={textPost}
        numberOfLines={8}
        seeMoreStyle={styles.moreLessButton}
        style={[styles.inputText, isTitle && styles.bold]}
        seeLessStyle={styles.moreLessButton}
        seeLessText=""
      >
        {renderText(textPost)}
      </ReadMore>
    );
  }

  let currentPosition = 0;
  const result: (string | React.ReactElement)[][] =
    heightlightTextPositions.map(({ index, length, userId, link }, i) => {
      // Add non-highlighted text before the mention
      const nonHighlightedText = textPost.slice(currentPosition, index);
      // Add highlighted text
      const highlightedText = (
        <Text
          allowFontScaling={false}
          onPress={() => handleOnClick(link, userId)}
          key={`highlighted-${i}`}
          style={styles.mentionText}
          selectable
        >
          {textPost.slice(index, index + length)}
        </Text>
      );

      // Update currentPosition for the next iteration
      currentPosition = index + length;

      // Return an array of non-highlighted and highlighted text
      return [
        <Fragment key={`text-${i}`}>{renderText(nonHighlightedText)}</Fragment>,
        highlightedText,
      ];
    });

  // Add any remaining non-highlighted text after the mentions
  const remainingText = textPost.slice(currentPosition);
  result.push([
    <Text
      allowFontScaling={false}
      selectable
      key="nonHighlighted-last"
      style={[styles.inputText, isTitle && styles.bold]}
    >
      {renderText(remainingText)}
    </Text>,
  ]);

  // Flatten the array and render
  return (
    <Text
      allowFontScaling={false}
      selectable
      style={[styles.inputText, isTitle && styles.bold]}
    >
      {result.flat()}
    </Text>
  );
};

export default memo(RenderTextWithMention);
