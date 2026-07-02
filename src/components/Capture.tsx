import { useEffect, useRef, useState } from 'react';
import type { TaskDraft } from '@/types';
import { parseTask } from '@/lib/parseTask';
import { IconMic, IconArrowRight } from './icons';

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
  /** Hands parsed drafts + the original text to the shell, which stashes them
   *  in the Inbox and routes to the review screen. */
  onParsed: (drafts: TaskDraft[], rawInput: string) => void;
}

const EXAMPLES = ['Try: "pay rent on the 1st"', '"gym 3x this week"'];

export function Capture({ onParsed }: Props) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [listening, setListening] = useState(false);

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
    onParsed(result, t);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-[22px] pb-6 pt-8">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink-primary">Capture</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Dump everything on your mind. myPA turns it into dated, prioritized tasks.
        </p>
      </div>

      <textarea
        aria-label="Brain dump"
        placeholder="e.g. Send the invoice Thursday, block the deck for Friday, call the vendor about the leak…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        className="w-full flex-1 resize-none rounded-[14px] border border-hairline-09 bg-surface p-[15px] text-[15px] leading-[1.6] text-ink-card placeholder-ink-fainter caret-accent-priority outline-none transition-colors duration-[120ms] focus:border-hairline-09"
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText((t) => (t ? t : ex.replace(/^Try: |"/g, '').replace(/"$/, '')))}
            className="rounded-full border border-hairline-08 bg-surface px-3 py-1.5 text-[12px] text-ink-muted transition-colors duration-[120ms] hover:text-ink-secondary"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {speechSupported && (
          <button
            onClick={toggleListen}
            aria-label={listening ? 'Stop listening' : 'Start voice input'}
            aria-pressed={listening}
            className={`flex h-[54px] w-[54px] flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-[120ms] ${
              listening
                ? 'border-accent-destructive bg-surface text-accent-destructive'
                : 'border-hairline bg-surface text-ink-secondary'
            }`}
          >
            <IconMic size={22} />
          </button>
        )}
        <button
          onClick={() => void onParse()}
          disabled={parsing || !text.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-btn-primary py-[15px] text-[16px] font-bold text-btn-primary-ink transition disabled:opacity-50"
        >
          {parsing ? 'Thinking…' : 'Parse into tasks'}
          {!parsing && <IconArrowRight size={18} />}
        </button>
      </div>

      {!speechSupported && (
        <p className="text-[12px] text-ink-fainter">
          Voice input isn't available in this browser. On iPhone, tap the mic on your keyboard to
          dictate into the box above.
        </p>
      )}
    </div>
  );
}
