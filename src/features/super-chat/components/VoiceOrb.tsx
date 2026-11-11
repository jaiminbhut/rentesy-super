import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View, useAnimatedValue } from 'react-native';

import { colors } from '../theme';
import { MicIcon } from './Icons';

const CORE = 30;
const RING_MS = 1600;
const RINGS = 3;

/**
 * "Breathing orb" listening indicator, driven by the live mic level (0–1).
 * - core: the mic disc swells slightly with your voice
 * - glow: a soft halo that grows and brightens when you speak louder
 * - rings: ripple outward continuously; louder speech pushes them further
 * Everything runs on the native driver. With reduced motion the rings are off and the glow just tracks the level.
 */
export function VoiceOrb({ level, active, animate }: { level: number; active: boolean; animate: boolean }) {
  // Smoothed level so the orb doesn't jitter between the ~100 ms mic samples.
  const smooth = useAnimatedValue(0);
  useEffect(() => {
    const target = active ? level : 0;
    if (!animate) return smooth.setValue(target);
    const a = Animated.timing(smooth, { toValue: target, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [level, active, animate, smooth]);

  const coreScale = smooth.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const glowScale = smooth.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.5] });
  const glowOpacity = smooth.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  // How far each ring travels: a gentle breath when quiet, a wider ripple when loud.
  const reach = smooth.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {animate && active && Array.from({ length: RINGS }, (_, i) => <Ring key={i} delay={(i * RING_MS) / RINGS} reach={reach} />)}
      <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.core, { transform: [{ scale: coreScale }] }]}>
        <MicIcon color="#FFF" size={0.8} />
      </Animated.View>
    </View>
  );
}

function Ring({ delay, reach }: { delay: number; reach: Animated.AnimatedInterpolation<number> }) {
  const t = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: RING_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])),
    ]);
    loop.start();
    return () => loop.stop();
  }, [delay, t]);

  const scale = Animated.add(1, Animated.multiply(t, reach));
  const opacity = t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] });
  return <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  core: { width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: 'rgba(53,167,120,0.28)' },
  ring: { position: 'absolute', width: CORE, height: CORE, borderRadius: CORE / 2, borderWidth: 1.5, borderColor: colors.mint },
});
