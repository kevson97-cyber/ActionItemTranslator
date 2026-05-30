'use client';

import { useState, useRef } from 'react';

interface Props {
  groqKey: string;
  onTranscript: (text: string) => void;
  onNeedSettings: () => void;
}

export default function VoiceRecorder({ groqKey, onTranscript, onNeedSettings }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    if (!groqKey) {
      onNeedSettings();
      return;
    }
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await transcribe(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Microphone access denied — check browser permissions');
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('file', blob, 'recording.webm');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'x-groq-key': groqKey },
        body: form,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onTranscript(data.text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="mb-3">
      <button
        onClick={recording ? stop : start}
        disabled={transcribing}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
          recording
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-[#1e2535] text-white hover:bg-[#252d40]'
        }`}
      >
        {recording ? '⏹ Stop recording' : '🎤 Record voice'}
      </button>
      {transcribing && (
        <p className="text-xs text-white/40 mt-2">Transcribing with Whisper large-v3…</p>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
