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
          onTextChange(buildText(finalSegmentsRef.current, ''));
          setRecording(false);
        } else {
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
      <p className="text-xs text-[#9ca3af] mb-3">
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
            ? 'bg-[#fee2e2] border-[#fca5a5] text-[#dc2626]'
            : 'bg-white border-[#ddd6fe] text-[#6b7280] hover:text-[#1e1b4b] hover:border-[#c4b5fd] shadow-sm'
        }`}
      >
        {recording ? (
          <>
            <span className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse inline-block" />
            Stop recording
          </>
        ) : (
          '🎤 Record voice'
        )}
      </button>
      {recording && (
        <p className="text-xs text-[#7c3aed]/60 mt-1.5">Listening… speak now</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}
