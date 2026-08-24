import * as React from 'react';
import { Image, Linking, TouchableOpacity, View } from 'react-native';
import { useStyles } from './styles';
import { PreviewDataImage } from './types';
import { getPreviewData } from './utils';
import { IMentionPosition } from '../../../core/types';
import RenderTextWithMention from '../RenderTextWithMention/RenderTextWithMention';
import { base64Images } from '../../../core/assets/images/base64Images';
import { Text } from '../../../core/components/Text';

export interface LinkPreviewProps {
  text: string;
  mentionPositionArr: IMentionPosition[];
}

export const LinkPreview = React.memo(
  ({ text, mentionPositionArr }: LinkPreviewProps) => {
    const [data, setData] = React.useState(null);

    const styles = useStyles();
    React.useEffect(() => {
      let isCancelled = false;

      const fetchData = async () => {
        setData(undefined);
        const newData = await getPreviewData(text);
        if (!isCancelled) {
          setData(newData);
        }
      };

      fetchData();
      return () => {
        isCancelled = true;
      };
    }, [text]);

    const handlePress = () => data?.link && Linking.openURL(data.link);

    const renderImageNode = React.useCallback(
      (image: PreviewDataImage) => {
        // `image` is a PreviewDataImage ({ url, width, height }), so the URI has
        // to come from image.url - passing the object itself meant `uri` was never
        // a string and the preview image silently never rendered.
        const imageUrl = image?.url
          ? { uri: image.url }
          : { uri: base64Images.previewLinkDefaultBackground };

        return (
          <Image
            accessibilityRole="image"
            resizeMode="cover"
            source={imageUrl}
            style={styles.image}
          />
        );
      },
      [styles.image]
    );

    const renderTitleNode = (title: string) => {
      return (
        <Text allowFontScaling={false} numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      );
    };

    const renderShortUrl = (url: string) => {
      const matches = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
      const shortUrl = matches ? matches[1] : '';
      return (
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={styles.shortUrl}
        >
          {shortUrl}
        </Text>
      );
    };
    return (
      <View>
        <RenderTextWithMention
          textPost={text}
          mentionPositionArr={mentionPositionArr}
        />
        {data?.link && (
          <TouchableOpacity
            onPress={handlePress}
            style={styles.metadataContainer}
          >
            {renderImageNode(data.image)}
            <View style={styles.metadataTextContainer}>
              {data?.link && renderShortUrl(data.link)}
              {data?.title && renderTitleNode(data.title)}
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);
