'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface Props {
  currentText: string;
  onTextChange: (text: string) => void;
}

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
  const isStoppingRef = useRef(false);

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

    // Each call creates a fresh SpeechRecognition instance.
    // Using continuous: false so sessions are short and bounded — on restart we
    // create a NEW instance, which has no audio buffer from the previous session.
    // This prevents both iOS and Android from re-processing already-transcribed audio.
    const launchSession = () => {
      const SRC = getSRConstructor();
      if (!SRC || isStoppingRef.current) return;

      const recognition = new SRC();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognitionRef.current = recognition;

      recognition.onresult = (event: SR) => {
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
        finalSegmentsRef.current = finals;
        onTextChange(buildText(finals, interim));
      };

      recognition.onerror = (event: SR) => {
        if (event.error !== 'aborted') setError(`Mic error: ${event.error}`);
        setRecording(false);
      };

      recognition.onend = () => {
        if (isStoppingRef.current) {
          // User tapped Stop — commit the last finals and finish
          onTextChange(buildText(finalSegmentsRef.current, ''));
          setRecording(false);
        } else {
          // Session ended naturally (silence/pause) — commit finals into base
          // and launch a NEW instance so the next session starts with a clean
          // audio buffer and cannot replay words from this session.
          baseTextRef.current = buildText(finalSegmentsRef.current, '');
          finalSegmentsRef.current = '';
          launchSession();
        }
      };

      try {
        recognition.start();
      } catch {
        setRecording(false);
      }
    };

    launchSession();
    setRecording(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText, onTextChange]);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  if (!supported) {
    return (
      <p className="text-xs text-white/20 mb-3">
        Voice input requires Chrome or Safari.
      </p>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={recording ? stop : start}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all border ${
          recording
            ? 'bg-red-950/40 border-[#f87171]/25 text-[#f87171]'
            : 'bg-[#0d1117] border-white/[0.08] text-white/55 hover:text-white/80 hover:border-white/[0.14]'
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
        <p className="text-xs text-[#4f8ef7]/50 mt-1.5">Listening… speak now</p>
      )}
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
