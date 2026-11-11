// Sample voice message: used when the microphone can't be used (Expo Go, Apple's Device Hub,
// devices without speech recognition). It plays the same recording state as real voice input,
// with a synthetic waveform and words appearing as if spoken, so the voice UI can still be demoed.
// The message it sends is tagged "Sample voice" so nobody thinks it was transcribed.

// Each phrase triggers a different trade in script.ts.
const SAMPLE_PHRASES = [
  'The bathroom light isn’t working since this morning.',
  'The AC in the bedroom isn’t cooling at all.',
  'The main door lock is stuck and won’t turn.',
];
let nextPhrase = 0;

const TICK_MS = 100;
const LEAD_SILENCE_MS = 450;
const TRAILING_SILENCE_MS = 650;

type Handlers = {
  onLevel: (level: number) => void;
  onTranscript: (text: string) => void;
  /** Called once with the full phrase when the sample finishes (not called on cancel). */
  onDone: (text: string) => void;
};

export function playSampleVoice({ onLevel, onTranscript, onDone }: Handlers) {
  const phrase = SAMPLE_PHRASES[nextPhrase++ % SAMPLE_PHRASES.length];
  const words = phrase.split(' ');
  const timers: ReturnType<typeof setTimeout>[] = [];
  let speaking = false;
  let finished = false;

  // Synthetic mic level: lively while "speaking", a low hum otherwise.
  let tick = 0;
  const levelTimer = setInterval(() => {
    tick += 1;
    const level = speaking ? 0.3 + 0.55 * Math.abs(Math.sin(tick * 1.7)) * (0.6 + 0.4 * Math.random()) : 0.04;
    onLevel(level);
  }, TICK_MS);

  // Reveal the words one at a time, paced by word length.
  let at = LEAD_SILENCE_MS;
  words.forEach((_, i) => {
    timers.push(setTimeout(() => {
      speaking = true;
      onTranscript(words.slice(0, i + 1).join(' '));
    }, at));
    at += 140 + 35 * Math.min(words[i].length, 8);
  });
  timers.push(setTimeout(() => (speaking = false), at));
  timers.push(setTimeout(() => finish(), at + TRAILING_SILENCE_MS));

  const stop = () => {
    clearInterval(levelTimer);
    timers.forEach(clearTimeout);
    onLevel(0);
  };

  /** End now and send the whole phrase (like tapping send mid-sentence on a real recording). */
  function finish() {
    if (finished) return;
    finished = true;
    stop();
    onDone(phrase);
  }

  return {
    finish,
    cancel() {
      if (finished) return;
      finished = true;
      stop();
    },
  };
}
