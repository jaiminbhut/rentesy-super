import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { playSampleVoice } from './sampleVoice';

// expo-speech-recognition throws on import when its native module is missing
// (e.g. in Expo Go), so only load it once we know the module is there.
type SpeechModule = typeof import('expo-speech-recognition');
const speech: SpeechModule | null =
  Platform.OS === 'web' || requireOptionalNativeModule('ExpoSpeechRecognition')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional load, see above
      (require('expo-speech-recognition') as SpeechModule)
    : null;

export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'finishing';

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone or speech access is off. You can turn it on in Settings.',
  'no-speech': 'I didn’t catch that. Tap the mic and try again.',
  'speech-timeout': 'I didn’t catch that. Tap the mic and try again.',
  network: 'Speech recognition needs a connection. Check your network and try again.',
  busy: 'The microphone is busy. Try again in a moment.',
};

// Errors that mean "this environment can't do voice" (e.g. Apple's Device Hub blocks the mic):
// fall back to the sample voice message instead of showing an error.
const FALLBACK_ERRORS = new Set(['audio-capture', 'service-not-allowed', 'language-not-supported']);

/**
 * Voice input. Uses real speech-to-text (expo-speech-recognition) when the device allows it,
 * otherwise plays a clearly labelled sample voice message (see sampleVoice.ts).
 * A denied permission is respected: it shows a notice instead of falling back.
 */
export function useVoiceInput({
  onFinal,
  onError,
}: {
  onFinal: (text: string, info: { sample: boolean }) => void;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [level, setLevel] = useState(0);
  const [isSample, setIsSample] = useState(false);
  const transcriptRef = useRef('');
  const cancelledRef = useRef(false);
  const heardRef = useRef(false);
  const fallbackRef = useRef(false);
  const sampleRef = useRef<ReturnType<typeof playSampleVoice> | null>(null);

  const reset = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setLevel(0);
    setStatus('idle');
    setIsSample(false);
  }, []);

  const startSample = useCallback(() => {
    setIsSample(true);
    setTranscript('');
    setStatus('listening');
    sampleRef.current = playSampleVoice({
      onLevel: setLevel,
      onTranscript: setTranscript,
      onDone: (text) => {
        sampleRef.current = null;
        reset();
        onFinal(text, { sample: true });
      },
    });
  }, [onFinal, reset]);

  const emitFinal = useEffectEvent((text: string) => onFinal(text, { sample: false }));
  const emitError = useEffectEvent(onError);
  const fallBackToSample = useEffectEvent(startSample);

  useEffect(() => {
    if (!speech) return;
    const module = speech.ExpoSpeechRecognitionModule;
    const subs = [
      module.addListener('start', () => setStatus('listening')),
      module.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        if (text) heardRef.current = true;
        transcriptRef.current = text;
        setTranscript(text);
      }),
      module.addListener('volumechange', (event) => setLevel(Math.max(0, Math.min(1, event.value / 10)))),
      module.addListener('error', (event) => {
        if (__DEV__) console.warn(`[voice] ${event.error}: ${event.message}`);
        if (event.error === 'aborted') return;
        if (FALLBACK_ERRORS.has(event.error) && !heardRef.current) {
          fallbackRef.current = true; // switch to the sample once the session has fully ended
          return;
        }
        emitError(ERROR_MESSAGES[event.error] ?? 'Voice input stopped unexpectedly. Please try again.');
      }),
      // Always the last event of a session, including after errors.
      module.addListener('end', () => {
        const text = transcriptRef.current.trim();
        reset();
        if (fallbackRef.current && !cancelledRef.current) {
          fallbackRef.current = false;
          return fallBackToSample();
        }
        if (!cancelledRef.current && text) emitFinal(text);
      }),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, [reset]); // effect events are intentionally not dependencies

  // Stop a running sample if the screen goes away.
  useEffect(() => () => sampleRef.current?.cancel(), []);

  const start = useCallback(async () => {
    const module = speech?.ExpoSpeechRecognitionModule;
    if (!module || !module.isRecognitionAvailable()) return startSample();

    setStatus('starting');
    const permission = await module.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus('idle');
      return onError(ERROR_MESSAGES['not-allowed']);
    }
    cancelledRef.current = false;
    heardRef.current = false;
    fallbackRef.current = false;
    transcriptRef.current = '';
    setTranscript('');
    module.start({
      lang: 'en-IN',
      interimResults: true,
      continuous: false, // stops by itself when the landlord pauses
      addsPunctuation: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, [onError, startSample]);

  /** Stop listening and send what was heard. */
  const finish = useCallback(() => {
    if (sampleRef.current) return sampleRef.current.finish();
    if (!speech) return;
    setStatus('finishing');
    speech.ExpoSpeechRecognitionModule.stop();
  }, []);

  /** Stop listening and throw the transcript away. */
  const cancel = useCallback(() => {
    if (sampleRef.current) {
      sampleRef.current.cancel();
      sampleRef.current = null;
      return reset();
    }
    if (!speech) return;
    cancelledRef.current = true;
    speech.ExpoSpeechRecognitionModule.abort();
  }, [reset]);

  return { status, transcript, level, isSample, start, finish, cancel };
}
