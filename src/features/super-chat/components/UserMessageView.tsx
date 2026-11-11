import { useEffect } from 'react';
import { Animated, Image, StyleSheet, Text, View, useAnimatedValue } from 'react-native';

import { bubbleIn, useEntrance } from '../motion';
import { colors, springs } from '../theme';
import type { UserMessage } from '../types';
import { MicIcon } from './Icons';

type Props = { message: UserMessage; read: boolean; animate: boolean };

export function UserMessageView({ message, read, animate }: Props) {
  const enter = useEntrance(animate);

  return (
    <Animated.View style={[styles.line, bubbleIn(enter)]}>
      {message.kind === 'photo' ? (
        <PhotoBubble uri={message.uri} aspectRatio={message.aspectRatio} time={message.time} read={read} animate={animate} />
      ) : (
        <View style={styles.bubble}>
          {message.kind === 'voice' && (
            <View style={styles.voiceTag} accessibilityLabel={message.sample ? 'Sample voice message' : 'Sent by voice'}>
              <MicIcon color="#C4DFD1" size={0.6} />
              <Text style={styles.voiceTagText}>{message.sample ? 'Sample voice' : 'Voice'}</Text>
            </View>
          )}
          <Text style={styles.text}>{message.text}</Text>
          <View style={[styles.meta, styles.metaBelowText]}>
            <Text style={styles.time}>{message.time}</Text>
            <ReadTicks read={read} animate={animate} sentColor="#C4DFD1" readColor="#FFFFFF" />
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function PhotoBubble({ uri, aspectRatio, time, read, animate }: { uri: string; aspectRatio: number; time: string; read: boolean; animate: boolean }) {
  // The frame arrives with the bubble; the photo itself fades in once decoded.
  const loaded = useAnimatedValue(animate ? 0 : 1);
  const ratio = Math.min(Math.max(aspectRatio, 0.75), 1.6);
  return (
    <View style={[styles.photoFrame, { aspectRatio: ratio }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: loaded }]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel="Photo you attached"
          onLoad={() => Animated.timing(loaded, { toValue: 1, duration: 280, useNativeDriver: true }).start()}
        />
      </Animated.View>
      {/* Hairline drawn on top of the photo, so it follows the rounded corners exactly. */}
      <View style={styles.photoEdge} pointerEvents="none" />
      <View style={[styles.photoTime, styles.meta]}>
        <Text style={styles.photoTimeText}>{time}</Text>
        <ReadTicks read={read} animate={animate} sentColor="rgba(255,255,255,0.75)" readColor="#8FE3BC" />
      </View>
    </View>
  );
}

/**
 * Sent = one tick. Read = a second tick slides in and both take the read color.
 * Drawn with Views (not "✓✓" text) so the ticks line up with the time on every platform.
 */
function ReadTicks({ read, animate, sentColor, readColor }: { read: boolean; animate: boolean; sentColor: string; readColor: string }) {
  const progress = useAnimatedValue(read ? 1 : 0);
  useEffect(() => {
    if (!animate) return progress.setValue(read ? 1 : 0);
    Animated.spring(progress, { toValue: read ? 1 : 0, useNativeDriver: true, ...springs.pop }).start();
  }, [read, animate, progress]);

  const color = read ? readColor : sentColor;
  return (
    <View style={styles.ticks} accessibilityLabel={read ? 'Read' : 'Sent'}>
      <Tick color={color} style={styles.tickFirst} />
      <Animated.View
        style={[
          styles.tickSecond,
          { opacity: progress, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-3, 0] }) }] },
        ]}
      >
        <Tick color={color} />
      </Animated.View>
    </View>
  );
}

function Tick({ color, style }: { color: string; style?: object }) {
  return <View style={[styles.tick, { borderColor: color }, style]} />;
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  bubble: { maxWidth: '84%', backgroundColor: colors.brand, borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 9 },
  voiceTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginLeft: -3 },
  voiceTagText: { color: '#C4DFD1', fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  text: { color: '#FFF', fontSize: 14, lineHeight: 21, letterSpacing: -0.1 },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  metaBelowText: { marginTop: 8 },
  time: { color: '#C4DFD1', fontSize: 10 },
  photoFrame: { width: '62%', maxWidth: 240, borderRadius: 18, borderBottomRightRadius: 5, overflow: 'hidden', backgroundColor: colors.brandSoft },
  photoEdge: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 18, borderBottomRightRadius: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(20,35,31,0.12)' },
  photoTime: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(20,35,31,0.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  photoTimeText: { color: '#FFF', fontSize: 10 },
  // Each tick is an L (right + bottom border) rotated into a check mark.
  ticks: { width: 14, height: 10, marginTop: 1 },
  tick: { width: 4, height: 8, borderRightWidth: 1.5, borderBottomWidth: 1.5, transform: [{ rotate: '40deg' }] },
  tickFirst: { position: 'absolute', left: 2, top: 0 },
  tickSecond: { position: 'absolute', left: 6, top: 0 },
});
