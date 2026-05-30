'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  currentText: string;
  onTextChange: (text: string) => void;
}

// SpeechRecognition is not in TypeScript's standard DOM lib — use any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SR = any;

function getSRConstructor(): SR | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceRecorder({ currentText, onTextChange }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState('');

  const recognitionRef = useRef<SR>(null);
  const baseTextRef = useRef('');
  const finalSegmentsRef = useRef('');
  const isStoppingRef = useRef(false); // true only when user explicitly taps Stop

  useEffect(() => {
    setSupported(getSRConstructor() !== null);
  }, []);

  const buildText = (finals: string, interim: string) => {
    const base = baseTextRef.current;
    const appended = (finals + interim).trim();
    if (!appended) return base;
    return base ? `${base}\n${appended}` : appended;
  };

  const start = useCallback(() => {
    const SRClass = getSRConstructor();
    if (!SRClass) return;
    setError('');

    baseTextRef.current = currentText;
    finalSegmentsRef.current = '';
    isStoppingRef.current = false;

    const recognition = new SRClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SR) => {
      // Iterate ALL results from 0 (not event.resultIndex) — on iOS Safari,
      // resultIndex is always 0, causing duplicate appends if we increment.
      // Rebuilding from the full results list is always correct.
      let finals = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript as string;
        if (event.results[i].isFinal) {
          finals += t + ' ';
        } else {
          interim += t;
        }
      }
      finalSegmentsRef.current = finals; // replace, not append
      onTextChange(buildText(finals, interim));
    };

    recognition.onerror = (event: SR) => {
      if (event.error !== 'aborted') setError(`Mic error: ${event.error}`);
      setRecording(false);
    };

    recognition.onend = () => {
      if (isStoppingRef.current) {
        // User tapped Stop — commit finals and done
        onTextChange(buildText(finalSegmentsRef.current, ''));
        setRecording(false);
      } else {
        // iOS ended the session automatically (it doesn't truly support continuous mode).
        // Commit the finals into baseText and restart so the next speech segment
        // doesn't re-process the same words.
        baseTextRef.current = buildText(finalSegmentsRef.current, '');
        finalSegmentsRef.current = '';
        try {
          recognition.start();
        } catch {
          setRecording(false);
        }
      }
    };

    recognition.start();
    setRecording(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText, onTextChange]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  if (!supported) {
    return (
      <p className="text-xs text-white/30 mb-3">
        Voice input requires Chrome or Safari.
      </p>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={recording ? stop : start}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          recording
            ? 'bg-red-500 text-white'
            : 'bg-[#1e2535] text-white hover:bg-[#252d40]'
        }`}
      >
        {recording ? (
          <>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse inline-block" />
            Stop recording
          </>
        ) : (
          '🎤 Record voice'
        )}
      </button>
      {recording && (
        <p className="text-xs text-white/40 mt-1.5">Listening… speak now</p>
      )}
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
