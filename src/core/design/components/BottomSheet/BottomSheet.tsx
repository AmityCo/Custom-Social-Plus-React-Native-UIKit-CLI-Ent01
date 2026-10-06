import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { useStyles } from './styles';

const ANIMATION_MS = 220;

export type BottomSheetProps = {
  /** Drives open/close. The sheet animates, so it is not an instant swap. */
  visible: boolean;
  /** Px, or a percentage of screen height such as '90%'. */
  height?: number | string;
  /** Fires once the sheet has finished sliding out - unmount it here. */
  onClose?: () => void;
  children?: React.ReactNode;
};

function resolveHeight(height: number | string): number {
  const screen = Dimensions.get('window').height;
  if (typeof height === 'number') return height;
  const pct = parseFloat(height);
  return Number.isFinite(pct) ? (screen * pct) / 100 : screen * 0.5;
}

/**
 * Declarative bottom sheet for features that own their own sheet.
 *
 * Built on RN's Modal rather than `@devvie/bottom-sheet`: that library is
 * positioned inline and its own docs say not to place it inside a panning
 * container, but these sheets are opened from rows inside the feed's FlatList.
 * A Modal renders in its own window, so the parent scroller cannot affect it.
 *
 * Deliberately NOT the global store-driven BottomSheetComponent - that one is
 * an app-wide singleton, and a feature sheet must not be able to close
 * someone else's.
 *
 * Upstream (v4.3.1) has a reanimated-based sheet at this path. This presents
 * the same surface (`visible` / `height` / `onClose` plus `.ScrollView`) so
 * call sites written against upstream need no edit, and porting the real one
 * later is a straight replacement here.
 */
function BottomSheetBase({
  visible,
  height = '50%',
  onClose,
  children,
}: BottomSheetProps) {
  const { styles } = useStyles();
  // Kept mounted across the slide-out so the close is visible, then dropped.
  const [isMounted, setIsMounted] = useState(visible);
  const slide = useRef(new Animated.Value(0)).current;
  const sheetHeight = resolveHeight(height);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.timing(slide, {
        toValue: 1,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!isMounted) return;
    Animated.timing(slide, {
      toValue: 0,
      duration: ANIMATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIsMounted(false);
      onClose?.();
    });
  }, [visible]);

  const requestClose = useCallback(() => {
    // Mirrors a backdrop tap / hardware back onto the owner's `visible`, which
    // is the single source of truth; the slide-out runs when it flips.
    onClose?.();
  }, [onClose]);

  if (!isMounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={requestClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetHeight, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Matches upstream's compound API so call sites need no edit. */
const ScrollViewArea = forwardRef<
  ScrollView,
  React.ComponentProps<typeof ScrollView>
>((props, ref) => <ScrollView ref={ref} {...props} />);
ScrollViewArea.displayName = 'BottomSheet.ScrollView';

export const BottomSheet = Object.assign(BottomSheetBase, {
  ScrollView: ScrollViewArea,
});
