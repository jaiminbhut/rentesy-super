import { StyleSheet, View } from 'react-native';

import { colors } from '../theme';

// Drawn with Views so they look identical on iOS, Android and web (no icon font needed).

export function MicIcon({ color = colors.icon, size = 1 }: { color?: string; size?: number }) {
  return (
    <View style={[styles.mic, { transform: [{ scale: size }] }]}>
      <View style={[styles.micHead, { borderColor: color }]} />
      <View style={[styles.micCup, { borderColor: color }]} />
      <View style={[styles.micStem, { backgroundColor: color }]} />
      <View style={[styles.micBase, { backgroundColor: color }]} />
    </View>
  );
}

export function PlusIcon({ color = colors.icon }: { color?: string }) {
  return (
    <View style={styles.plus}>
      <View style={[styles.plusBar, { backgroundColor: color }]} />
      <View style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: color }]} />
    </View>
  );
}

export function CloseIcon({ color = colors.icon }: { color?: string }) {
  return (
    <View style={[styles.plus, { transform: [{ rotate: '45deg' }] }]}>
      <View style={[styles.plusBar, { backgroundColor: color }]} />
      <View style={[styles.plusBar, styles.plusBarVertical, { backgroundColor: color }]} />
    </View>
  );
}

export function ArrowUpIcon({ color = '#FFF' }: { color?: string }) {
  return (
    <View style={styles.arrow}>
      <View style={[styles.arrowHead, { borderColor: color }]} />
      <View style={[styles.arrowStem, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mic: { width: 16, height: 20, alignItems: 'center' },
  micHead: { width: 8, height: 12, borderRadius: 4, borderWidth: 1.6, zIndex: 1 },
  micCup: { width: 14, height: 8, marginTop: -5, borderWidth: 1.6, borderTopWidth: 0, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  micStem: { width: 1.6, height: 3 },
  micBase: { width: 8, height: 1.6, borderRadius: 1 },
  plus: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  plusBar: { position: 'absolute', width: 14, height: 1.8, borderRadius: 1 },
  plusBarVertical: { width: 1.8, height: 14 },
  arrow: { width: 14, height: 16, alignItems: 'center' },
  arrowHead: { width: 9, height: 9, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }], marginTop: 2 },
  arrowStem: { width: 2, height: 12, marginTop: -9, borderRadius: 1 },
});
