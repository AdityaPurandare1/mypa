import { useEffect, useRef, useState } from 'react';
import type { TaskDraft } from '@/types';
import { parseTask } from '@/lib/parseTask';
import { ConfirmSheet } from './ConfirmSheet';

// Minimal typing for the (still non-standard) Web Speech API. Feature-detected
// below; on iOS Safari it's absent and we fall back to keyboard dictation into
// the same textarea (the OS mic on the keyboard fills it just fine).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Props {
  onSaved: () => void;
}

export function Capture({ onSaved }: Props) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);
  const [drafts, setDrafts] = useState<TaskDraft[] | null>(null);
  const [submitted, setSubmitted] = useState('');

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = getRecognitionCtor() !== null;

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function toggleListen() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let out = '';
      for (let i = 0; i < e.results.length; i++) out += e.results[i][0].transcript;
      setText(out);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function onParse() {
    const t = text.trim();
    if (!t) return;
    recRef.current?.stop();
    setParsing(true);
    const result = await parseTask(t);
    setParsing(false);
    setSubmitted(t);
    setDrafts(result);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-white">What's on your mind?</h1>
        <p className="mt-1 text-sm text-slate-400">
          Brain-dump everything. myPA splits it into tasks you can review before saving.
        </p>
      </div>

      <textarea
        aria-label="Brain dump"
        placeholder="e.g. Send the invoice Thursday, block the deck for Friday, call the vendor about the leak…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-brand"
      />

      <div className="flex items-center gap-3">
        {speechSupported && (
          <button
            onClick={toggleListen}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            aria-pressed={listening}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-xl transition ${
              listening ? 'animate-pulse bg-red-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            🎙
          </button>
        )}
        <button
          onClick={() => void onParse()}
          disabled={parsing || !text.trim()}
          className="flex-1 rounded-2xl bg-brand py-3 font-medium text-white transition hover:bg-brand-soft disabled:opacity-50"
        >
          {parsing ? 'Thinking…' : 'Parse into tasks'}
        </button>
      </div>

      {!speechSupported && (
        <p className="text-xs text-slate-500">
          Voice input isn't available in this browser. On iPhone, tap the mic on your keyboard to
          dictate into the box above.
        </p>
      )}

      {drafts && (
        <ConfirmSheet
          initial={drafts}
          rawInput={submitted}
          onClose={() => setDrafts(null)}
          onSaved={() => {
            setText('');
            onSaved();
          }}
        />
      )}
    </div>
  );
}
