import { StyleSheet, Text, View, Image } from 'react-native';
import { memo } from 'react';
import { useTheme } from 'react-native-paper';
import { MyMD3Theme } from '../../../core/providers/AmityUIKitProvider';
import { base64Images } from '../../../core/assets/images/base64Images';
const NoSearchResult = () => {
  const theme = useTheme() as MyMD3Theme;
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    img: {
      width: 60,
      height: 60,
      tintColor: theme.colors.baseShade4,
    },
    noResultText: {
      fontSize: 17,
      fontWeight: 'bold',
      color: theme.colors.baseShade3,
      marginTop: 12,
    },
  });
  return (
    <View style={styles.container}>
      <Image style={styles.img} source={{ uri: base64Images.noSearchResult }} />
      <Text allowFontScaling={false} style={styles.noResultText}>
        No results found
      </Text>
    </View>
  );
};

export default memo(NoSearchResult);
