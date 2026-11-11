import { type ComponentRef, type RefObject, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, TextInput, TouchableOpacity, View, useAnimatedValue } from 'react-native';

import { colors } from '../theme';
import type { useVoiceInput } from '../useVoiceInput';
import { ArrowUpIcon, CloseIcon, MicIcon, PlusIcon } from './Icons';
import { Notice } from './Notice';
import { VoiceOrb } from './VoiceOrb';

type Props = {
  busy: boolean;
  animate: boolean;
  voice: ReturnType<typeof useVoiceInput>;
  onSendText: (text: string) => void;
  onAttach: () => void;
  onViewRequest: () => void;
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  /** Problems with voice / photos. Shown in place of the quick replies so it never covers the chat. */
  notice: { id: number; message: string } | null;
};

/**
 * Bottom composer with two modes that cross-fade:
 * - text: attach, text field, and a mic button that turns into send once you type
 * - voice: cancel, recording timer, breathing mic orb, and send
 */
export function Composer({ busy, animate, voice, onSendText, onAttach, onViewRequest, inputRef, notice }: Props) {
  const [text, setText] = useState('');
  const hasText = text.trim().length > 0;
  const voiceMode = voice.status !== 'idle';

  const mode = useAnimatedFlag(voiceMode, animate, 'spring');
  const sendShown = useAnimatedFlag(hasText, animate, 'timing');

  const send = () => {
    if (!hasText || busy) return;
    onSendText(text);
    setText('');
  };

  const fadeOut = mode.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const slideIn = mode.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  return (
    <View style={styles.bottomArea}>
      {/* Row above the composer: quick replies, a notice, or the live transcript while listening. */}
      <View style={styles.aboveRow}>
        {notice && !voiceMode ? (
          <Notice key={notice.id} message={notice.message} animate={animate} />
        ) : (
          <Animated.View style={[styles.chips, { opacity: fadeOut }]} pointerEvents={voiceMode ? 'none' : 'auto'}>
            <Chip label="View request" glyph="↗" disabled={busy} onPress={onViewRequest} />
            <Chip label="Add a note" glyph="＋" disabled={busy} onPress={() => inputRef.current?.focus()} />
          </Animated.View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, styles.transcriptRow, { opacity: mode, transform: [{ translateY: slideIn }] }]} pointerEvents="none">
          {voice.isSample && (
            <View style={styles.sampleTag} accessibilityLabel="Microphone unavailable, playing a sample voice message">
              <Text style={styles.sampleTagText}>SAMPLE</Text>
            </View>
          )}
          <Text style={[styles.transcript, !voice.transcript && styles.transcriptHint]} numberOfLines={1} ellipsizeMode="head" accessibilityLiveRegion="polite">
            {voice.transcript ||
              (voice.isSample ? 'Mic unavailable here, playing a sample…' : voice.status === 'starting' ? 'Starting the mic…' : 'Listening… describe the problem')}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.composer}>
        {/* Text mode */}
        <Animated.View style={[styles.row, { opacity: fadeOut }]} pointerEvents={voiceMode ? 'none' : 'auto'}>
          <TouchableOpacity style={styles.addButton} onPress={onAttach} disabled={busy} accessibilityRole="button" accessibilityLabel="Attach a photo">
            <PlusIcon />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message Super…"
            placeholderTextColor={colors.faint}
            returnKeyType="send"
            onSubmitEditing={send}
            submitBehavior="submit"
            accessibilityLabel="Message Super"
          />
          <View style={styles.rightSlot}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, swap(sendShown, false)]} pointerEvents={hasText ? 'none' : 'auto'}>
              <TouchableOpacity style={styles.micButton} onPress={voice.start} disabled={busy} accessibilityRole="button" accessibilityLabel="Speak to Super">
                <MicIcon color={busy ? colors.faint : colors.icon} />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.center, swap(sendShown, true)]} pointerEvents={hasText ? 'auto' : 'none'}>
              <TouchableOpacity style={[styles.sendButton, busy && styles.dimmed]} onPress={send} disabled={busy} accessibilityRole="button" accessibilityLabel="Send message">
                <ArrowUpIcon />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Voice mode */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.row, styles.voiceRow, { opacity: mode }]} pointerEvents={voiceMode ? 'auto' : 'none'}>
          <TouchableOpacity style={styles.addButton} onPress={voice.cancel} accessibilityRole="button" accessibilityLabel="Cancel voice message">
            <CloseIcon />
          </TouchableOpacity>
          <RecordingTimer key={voiceMode ? 'timer-on' : 'timer-off'} active={voice.status === 'listening'} animate={animate} />
          <VoiceOrb level={voice.level} active={voice.status === 'listening'} animate={animate} />
          <TouchableOpacity
            style={[styles.sendButton, voice.status !== 'listening' && styles.dimmed]}
            onPress={voice.finish}
            disabled={voice.status !== 'listening'}
            accessibilityRole="button"
            accessibilityLabel="Send voice message"
          >
            {voice.status === 'listening' ? <ArrowUpIcon /> : <ActivityIndicator size="small" color="#FFF" />}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text style={styles.footerNote}>Prototype · Super can make mistakes. Check important details.</Text>
    </View>
  );
}

function Chip({ label, glyph, disabled, onPress }: { label: string; glyph: string; disabled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, disabled && styles.dimmed]} onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={styles.chipText}>{label}</Text>
      <Text style={styles.chipGlyph}>{glyph}</Text>
    </TouchableOpacity>
  );
}

function RecordingTimer({ active, animate }: { active: boolean; animate: boolean }) {
  const [seconds, setSeconds] = useState(0);
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    let loop: Animated.CompositeAnimation | undefined;
    if (animate) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      loop.start();
    }
    return () => {
      clearInterval(id);
      loop?.stop();
      pulse.setValue(1);
    };
  }, [active, animate, pulse]);
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <View style={styles.timer} accessibilityLabel={`Recording, ${seconds} seconds`}>
      <Animated.View style={[styles.recDot, { opacity: pulse }]} />
      <Text style={styles.timerText}>{label}</Text>
    </View>
  );
}

/** A 0/1 Animated.Value that follows a boolean. */
function useAnimatedFlag(on: boolean, animate: boolean, kind: 'spring' | 'timing') {
  const v = useAnimatedValue(on ? 1 : 0);
  useEffect(() => {
    if (!animate) return v.setValue(on ? 1 : 0);
    const a = kind === 'spring'
      ? Animated.spring(v, { toValue: on ? 1 : 0, friction: 9, tension: 80, useNativeDriver: true })
      : Animated.timing(v, { toValue: on ? 1 : 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [on, animate, kind, v]);
  return v;
}

/** Cross-fade + rotate between the mic and send buttons. */
const swap = (v: Animated.Value, showWhenOn: boolean) => ({
  opacity: v.interpolate({ inputRange: [0, 1], outputRange: showWhenOn ? [0, 1] : [1, 0] }),
  transform: [
    { scale: v.interpolate({ inputRange: [0, 1], outputRange: showWhenOn ? [0.6, 1] : [1, 0.6] }) },
    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: showWhenOn ? ['-45deg', '0deg'] : ['0deg', '45deg'] }) },
  ],
});

const styles = StyleSheet.create({
  bottomArea: { borderTopWidth: 1, borderTopColor: '#E9ECE6', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.canvas },
  aboveRow: { minHeight: 32, marginBottom: 11 },
  chips: { flexDirection: 'row' },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: '#DFE6DE', backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', marginRight: 7 },
  chipText: { fontSize: 11, color: '#42534A', fontWeight: '500' },
  chipGlyph: { fontSize: 12, color: colors.brand, marginLeft: 7 },
  transcriptRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  transcript: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '500' },
  sampleTag: { backgroundColor: colors.mintSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginRight: 8 },
  sampleTagText: { color: '#257049', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  transcriptHint: { color: colors.muted, fontWeight: '400' },
  composer: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: '#E3E8E1', backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  voiceRow: { backgroundColor: '#F4F8F5' },
  addButton: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F1F4F0', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, marginHorizontal: 9, fontSize: 14, color: colors.ink, paddingVertical: 0, height: 40 },
  rightSlot: { width: 38, height: 34 },
  center: { alignItems: 'center', justifyContent: 'center' },
  micButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  dimmed: { opacity: 0.45 },
  timer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.recording, marginRight: 6 },
  timerText: { color: colors.ink, fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '500', minWidth: 30 },
  footerNote: { textAlign: 'center', color: '#A6AEA8', fontSize: 9, marginTop: 9 },
});
