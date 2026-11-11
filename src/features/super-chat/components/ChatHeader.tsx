import { useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useAnimatedValue } from 'react-native';

import { PROPERTY } from '../script';
import { colors } from '../theme';

/** `showProperty`: put the property in the subtitle (used while the property card is collapsed for the keyboard). */
export function ChatHeader({ busy, animate, showProperty, onRestart }: { busy: boolean; animate: boolean; showProperty: boolean; onRestart: () => void }) {
  // The online dot breathes while Super is working.
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    if (!busy || !animate) return pulse.setValue(1);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.35, duration: 500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [busy, animate, pulse]);

  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={styles.backGlyph}>‹</Text>
      </TouchableOpacity>
      <View style={styles.brandMark}><Text style={styles.brandGlyph}>r</Text></View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>Super</Text>
        <View style={styles.onlineRow}>
          <Animated.View style={[styles.onlineDot, { opacity: pulse }]} />
          <Text style={styles.onlineText} numberOfLines={1}>
            {busy ? `Working on ${PROPERTY.unit}…` : showProperty ? `${PROPERTY.name} · ${PROPERTY.unit}` : 'Your AI operator'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.moreButton} onPress={onRestart} accessibilityRole="button" accessibilityLabel="Restart conversation">
        <Text style={styles.moreGlyph}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PropertyCard() {
  return (
    <>
      <View style={styles.contextCard}>
        <View style={styles.contextIcon}><Text style={styles.contextIconText}>⌂</Text></View>
        <View style={styles.contextCopy}>
          <Text style={styles.contextLabel}>PROPERTY</Text>
          <Text style={styles.contextTitle}>{PROPERTY.name} · {PROPERTY.unit}</Text>
        </View>
        <View style={styles.contextChevron} accessibilityLabel="Change property"><Text style={styles.chevron}>›</Text></View>
      </View>
      <View style={styles.dateRow}>
        <View style={styles.dateRule} />
        <Text style={styles.dateText}>TODAY</Text>
        <View style={styles.dateRule} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: { height: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#ECEEE9' },
  backButton: { width: 30, height: 42, justifyContent: 'center' },
  backGlyph: { fontSize: 34, color: colors.ink, fontWeight: '300', marginTop: -4 },
  brandMark: { width: 39, height: 39, backgroundColor: colors.brand, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  brandGlyph: { color: '#FFF', fontSize: 24, fontWeight: '700', fontStyle: 'italic', marginTop: -2 },
  headerCopy: { marginLeft: 11, flex: 1 },
  headerTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint, marginRight: 5 },
  onlineText: { color: colors.muted, fontSize: 11, letterSpacing: 0.1 },
  moreButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  moreGlyph: { color: '#57665F', fontSize: 23, letterSpacing: 1, marginTop: -11 },
  contextCard: { marginHorizontal: 20, marginTop: 16, height: 62, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  contextIcon: { width: 36, height: 36, backgroundColor: '#EFF4EF', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  contextIconText: { color: colors.brand, fontSize: 20, fontWeight: '600' },
  contextCopy: { marginLeft: 10, flex: 1 },
  contextLabel: { color: '#8A968F', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  contextTitle: { color: colors.ink, fontWeight: '600', fontSize: 13, marginTop: 3 },
  contextChevron: { width: 25, height: 25, backgroundColor: '#F6F7F4', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chevron: { color: '#718078', fontSize: 18, fontWeight: '600', transform: [{ rotate: '90deg' }] },
  dateRow: { marginHorizontal: 24, marginTop: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  dateRule: { height: 1, flex: 1, backgroundColor: colors.rule },
  dateText: { color: '#9AA39D', fontSize: 9, letterSpacing: 1, marginHorizontal: 12, fontWeight: '600' },
});
