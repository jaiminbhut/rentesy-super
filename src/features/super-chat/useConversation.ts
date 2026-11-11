import { useCallback, useEffect, useRef, useState } from 'react';

import { INTRO_MESSAGE, createScript } from './script';
import { clock } from './time';
import type { ChatItem, SuperTurn, UserInput, UserMessage } from './types';

const TIMING = {
  introDelay: 350,
  beforeThinking: 650,
  thinking: 1900,
};

// Counter + random suffix: stays unique even when Fast Refresh re-runs this module and resets the counter.
let idCounter = 0;
const nextId = () => `m${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;

function toUserMessage(input: UserInput, time: string): UserMessage | null {
  if (input.kind === 'photo') return { id: nextId(), from: 'user', kind: 'photo', uri: input.uri, aspectRatio: input.aspectRatio, time };
  if (input.kind === 'view-request') return { id: nextId(), from: 'user', kind: 'text', text: 'View request', time };
  return { id: nextId(), from: 'user', kind: input.kind, text: input.text.trim(), time, sample: input.sample };
}

/**
 * Owns the chat timeline: user message → Super "thinking" → Super reply.
 * Timings are deliberate so the animations have room to breathe.
 */
export function useConversation({ instant }: { instant: boolean }) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const script = useRef(createScript());
  // Read when the intro plays (a moment after mount), by which time the OS setting is known.
  const instantRef = useRef(instant);
  useEffect(() => {
    instantRef.current = instant;
  }, [instant]);

  const later = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  // Clears in place: the array instance never changes, so effect cleanups always see the live timers.
  const clearTimers = (list: ReturnType<typeof setTimeout>[]) => {
    list.forEach(clearTimeout);
    list.length = 0;
  };

  const send = useCallback((input: UserInput, time = clock()) => {
    const message = toUserMessage(input, time);
    if (!message || (message.kind !== 'photo' && !message.text)) return;
    const turn: SuperTurn = { id: nextId(), from: 'super', status: 'thinking', thinkingLabel: script.current.thinkingLabel(input), time };
    const reply = script.current.reply(input);

    setItems((prev) => [...prev, message]);
    later(TIMING.beforeThinking, () => setItems((prev) => [...prev, turn]));
    later(TIMING.beforeThinking + TIMING.thinking, () =>
      setItems((prev) => prev.map((item) => (item.id === turn.id ? { ...turn, status: 'done', reply } : item))),
    );
  }, []);

  // Plays the opening exchange. Everything happens in timers, never synchronously in an effect.
  const playIntro = useCallback(() => {
    later(TIMING.introDelay, () => {
      if (!instantRef.current) return send({ kind: 'text', text: INTRO_MESSAGE });
      // Reduced motion: show the opening exchange already finished.
      const input: UserInput = { kind: 'text', text: INTRO_MESSAGE };
      const time = clock();
      const message = toUserMessage(input, time)!;
      const turn: SuperTurn = { id: nextId(), from: 'super', status: 'done', thinkingLabel: '', reply: script.current.reply(input), time };
      setItems([message, turn]);
    });
  }, [send]);

  useEffect(() => {
    playIntro();
    const pending = timers.current;
    return () => clearTimers(pending);
  }, [playIntro]);

  const restart = useCallback(() => {
    clearTimers(timers.current);
    script.current = createScript();
    setItems([]);
    playIntro();
  }, [playIntro]);

  const busy = items.some((item) => item.from === 'super' && item.status === 'thinking');

  return { items, busy, send, restart };
}
