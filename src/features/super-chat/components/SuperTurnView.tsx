import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useAnimatedValue } from 'react-native';

import { morph, pop, rise, useEntrance } from '../motion';
import { colors, springs } from '../theme';
import type { Receipt, RequestSummary, SuperTurn } from '../types';

/**
 * One Super turn. The avatar arrives with the thinking bubble and stays put;
 * when the reply is ready the thinking bubble tucks back into the avatar's corner
 * and the reply grows out of the same spot, then reveals its receipt piece by piece.
 */
export function SuperTurnView({ turn, animate }: { turn: SuperTurn; animate: boolean }) {
  // Only animate the reveal if this turn started in the thinking state while motion is allowed.
  const [willAnimate] = useState(() => animate && turn.status === 'thinking');
  const start = willAnimate ? 0 : 1;

  const avatarIn = useEntrance(willAnimate, { spring: { friction: 7, tension: 70 } });
  const thinkingIn = useEntrance(willAnimate, { spring: springs.soft });
  const replyIn = useAnimatedValue(start);
  const cardIn = useAnimatedValue(start);
  const pillIn = useAnimatedValue(start);
  const tailIn = useAnimatedValue(start);
  // Set once the thinking bubble has finished tucking away. Without motion the reply shows straight away.
  const [handedOff, setHandedOff] = useState(false);
  const shown: 'thinking' | 'reply' = turn.status === 'done' && (handedOff || !animate) ? 'reply' : 'thinking';

  // Thinking → reply handoff.
  useEffect(() => {
    if (turn.status !== 'done' || handedOff) return;
    if (!animate) {
      [replyIn, cardIn, pillIn, tailIn].forEach((v) => v.setValue(1));
      return;
    }
    const out = Animated.timing(thinkingIn, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true });
    out.start(({ finished }) => finished && setHandedOff(true));
    return () => out.stop();
  }, [turn.status, handedOff, animate, thinkingIn, replyIn, cardIn, pillIn, tailIn]);

  // Staggered reveal of the reply.
  useEffect(() => {
    if (shown !== 'reply' || !willAnimate) return;
    const spring = (v: Animated.Value, cfg: { friction: number; tension: number }) => Animated.spring(v, { toValue: 1, useNativeDriver: true, ...cfg });
    const reveal = Animated.parallel([
      spring(replyIn, springs.reply),
      Animated.stagger(140, [
        Animated.sequence([Animated.delay(120), spring(cardIn, { friction: 8, tension: 60 })]),
        Animated.sequence([Animated.delay(260), spring(pillIn, springs.pop)]),
        Animated.sequence([Animated.delay(260), Animated.timing(tailIn, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })]),
      ]),
    ]);
    reveal.start();
    return () => reveal.stop();
  }, [shown, willAnimate, replyIn, cardIn, pillIn, tailIn]);

  const reply = turn.reply;

  return (
    <View style={styles.line}>
      <Animated.View style={[styles.avatar, pop(avatarIn, 0.6)]}><Text style={styles.avatarLetter}>s</Text></Animated.View>
      {shown === 'thinking' || !reply ? (
        <Animated.View style={[styles.thinkingBubble, morph(thinkingIn)]} accessibilityLiveRegion="polite" accessibilityLabel={turn.thinkingLabel}>
          <ThinkingDots animate={animate} />
          <Text style={styles.thinkingLabel}>{turn.thinkingLabel}</Text>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.answerWrap, morph(replyIn)]} accessibilityLiveRegion="polite">
          {/* Bubbles holding a card take the full width: a self-sizing bubble can measure wrapped
              card text as one line on iOS and clip the card's last row. */}
          <View style={[styles.bubble, (reply.receipt || reply.summary) && styles.bubbleWide]}>
            <Text style={styles.answerText}>{reply.lead}</Text>
            {reply.receipt && <DispatchReceipt receipt={reply.receipt} cardIn={cardIn} pillIn={pillIn} />}
            {reply.summary && <SummaryCard summary={reply.summary} cardIn={cardIn} pillIn={pillIn} />}
            <Animated.View style={rise(tailIn, 6)}>
              {reply.follow && <Text style={styles.answerText}>{reply.follow}</Text>}
              <Text style={styles.timeText}>{turn.time}</Text>
            </Animated.View>
          </View>
          {reply.receipt && (
            <Animated.View style={[styles.handledRow, rise(tailIn, 4)]}>
              <Text style={styles.sparkle}>✦</Text>
              <Text style={styles.handledText}>Handled by Super</Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function DispatchReceipt({ receipt, cardIn, pillIn }: { receipt: Receipt; cardIn: Animated.Value; pillIn: Animated.Value }) {
  return (
    <Animated.View style={[styles.card, rise(cardIn, 10)]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}><Text style={styles.cardIconGlyph}>↗</Text></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{receipt.title}</Text>
          <Text style={styles.cardSub}>{receipt.subtitle}</Text>
        </View>
        <Animated.View style={[styles.pill, pop(pillIn)]}><Text style={styles.pillText}>{receipt.status}</Text></Animated.View>
      </View>
      <View style={styles.cardDivider} />
      <View style={styles.cardBottom}>
        <Text style={styles.cardDetail} numberOfLines={1}>{receipt.detail}</Text>
        <Text style={styles.ticket}>{receipt.ticket}</Text>
      </View>
    </Animated.View>
  );
}

function SummaryCard({ summary, cardIn, pillIn }: { summary: RequestSummary; cardIn: Animated.Value; pillIn: Animated.Value }) {
  return (
    <Animated.View style={[styles.card, rise(cardIn, 10)]}>
      <View style={styles.cardTop}>
        <View style={[styles.cardInfo, styles.noIcon]}>
          <Text style={styles.summaryTicket}>{summary.ticket}</Text>
          <Text style={styles.cardTitle}>{summary.issue}</Text>
        </View>
        <Animated.View style={[styles.pill, styles.pillOpen, pop(pillIn)]}><Text style={[styles.pillText, styles.pillOpenText]}>{summary.status}</Text></Animated.View>
      </View>
      <View style={styles.cardDivider} />
      {summary.rows.map((row) => (
        <View key={row.label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{row.label}</Text>
          <Text style={styles.summaryValue}>{row.value}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

/** Three dots pulsing in a wave. Static when motion is reduced. */
function ThinkingDots({ animate }: { animate: boolean }) {
  return (
    <View style={styles.dots}>
      {[0, 160, 320].map((delay) => <Dot key={delay} delay={delay} animate={animate} />)}
    </View>
  );
}

function Dot({ delay, animate }: { delay: number; animate: boolean }) {
  const v = useAnimatedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return v.setValue(1);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(480 - delay),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animate, delay, v]);
  const style = {
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [
      { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [1.5, -1.5] }) },
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) },
    ],
  };
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  avatar: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  avatarLetter: { color: '#FFF', fontSize: 16, fontWeight: '700', fontStyle: 'italic', marginTop: -2 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', marginLeft: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, borderTopLeftRadius: 5, height: 43, paddingHorizontal: 13 },
  dots: { flexDirection: 'row', alignItems: 'center', marginRight: 9 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#4C8067', marginHorizontal: 2 },
  thinkingLabel: { color: '#7C8982', fontSize: 12 },
  answerWrap: { flex: 1, marginLeft: 9, alignItems: 'flex-start' },
  bubbleWide: { alignSelf: 'stretch' },
  bubble: { maxWidth: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 17, borderTopLeftRadius: 5, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 9 },
  answerText: { color: colors.body, fontSize: 13, lineHeight: 19, letterSpacing: -0.05 },
  timeText: { fontSize: 10, color: '#A1AAA4', marginTop: 8 },
  card: { marginTop: 12, marginBottom: 11, backgroundColor: '#F7F9F6', borderRadius: 12, borderWidth: 1, borderColor: '#E9EEE8', paddingHorizontal: 11, paddingTop: 11, paddingBottom: 9 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  cardIconGlyph: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  cardInfo: { flex: 1, marginLeft: 9 },
  cardTitle: { fontSize: 12, color: colors.ink, fontWeight: '700' },
  cardSub: { color: '#79867E', fontSize: 10, marginTop: 3 },
  pill: { paddingHorizontal: 7, paddingVertical: 4, backgroundColor: colors.mintSoft, borderRadius: 6, marginLeft: 6 },
  pillText: { color: '#257049', fontSize: 8, letterSpacing: 0.7, fontWeight: '800' },
  cardDivider: { height: 1, backgroundColor: '#E6EBE4', marginVertical: 9 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardDetail: { color: '#5B6B62', fontSize: 10, fontWeight: '600' },
  ticket: { color: '#8A968F', fontSize: 10 },
  noIcon: { marginLeft: 0 },
  pillOpen: { backgroundColor: '#FFF4DE' },
  pillOpenText: { color: '#8A5A00' },
  summaryTicket: { color: '#8A968F', fontSize: 10, fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 3 },
  summaryLabel: { color: '#8A968F', fontSize: 11, marginRight: 12 },
  summaryValue: { flex: 1, color: colors.body, fontSize: 11, fontWeight: '600', textAlign: 'right' },
  handledRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginLeft: 3 },
  sparkle: { color: '#4A8A69', fontSize: 12, marginRight: 5 },
  handledText: { color: '#829087', fontSize: 10, fontWeight: '500' },
});
