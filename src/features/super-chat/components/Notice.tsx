import { StyleSheet, Text, Animated } from 'react-native';

import { rise, useEntrance } from '../motion';
import { colors } from '../theme';

/** Short message shown in the row above the input (in place of the quick replies). Remount (new key) to replay its entrance. */
export function Notice({ message, animate }: { message: string; animate: boolean }) {
  const enter = useEntrance(animate, { spring: { friction: 9, tension: 90 } });
  return (
    <Animated.View style={[styles.notice, rise(enter, 6)]} accessibilityLiveRegion="assertive" accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notice: { minHeight: 32, justifyContent: 'center', backgroundColor: colors.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  text: { color: '#FFF', fontSize: 12, lineHeight: 17 },
});
