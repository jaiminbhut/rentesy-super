import { useEffect } from 'react';
import { Animated, useAnimatedValue } from 'react-native';

import { springs } from './theme';

type Spring = { friction: number; tension: number };

/** An Animated.Value that springs 0 → 1 once on mount (or starts at 1 when `animate` is false). */
export function useEntrance(animate: boolean, { delay = 0, spring = springs.bubble }: { delay?: number; spring?: Spring } = {}) {
  const value = useAnimatedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return value.setValue(1);
    const animation = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(value, { toValue: 1, useNativeDriver: true, ...spring }),
    ]);
    animation.start();
    return () => animation.stop();
    // Run once per mount: items that are already on screen never re-animate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

const range = (value: Animated.Value, from: number, to: number) => value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

/** Message bubbles: lift up and settle. */
export const bubbleIn = (v: Animated.Value) => ({ opacity: v, transform: [{ translateY: range(v, 14, 0) }, { scale: range(v, 0.97, 1) }] });

/** Grows from the top-left corner (next to Super's avatar), so thinking → reply reads as one bubble changing shape. */
export const morph = (v: Animated.Value) => ({ opacity: v, transformOrigin: 'left top', transform: [{ scale: range(v, 0.88, 1) }, { translateY: range(v, 6, 0) }] });

export const rise = (v: Animated.Value, distance: number) => ({ opacity: v, transform: [{ translateY: range(v, distance, 0) }] });

export const pop = (v: Animated.Value, from = 0.5) => ({ opacity: v, transform: [{ scale: range(v, from, 1) }] });
