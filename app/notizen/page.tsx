'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr';

export default function NotizenPage() {
  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Minimaler Platzhalter – im nächsten Schritt füllen wir das dynamisch aus Setup/Edition.
  const temaLabel = 'Thema XY';
  const quote = 'Zitat folgt…';
  const questions: Record<DayKey, string> = useMemo(
    () => ({
      Mo: 'Frage 1 folgt…',
      Di: 'Frage 2 folgt…',
      Mi: 'Frage 3 folgt…',
      Do: 'Frage 4 folgt…',
      Fr: 'Frage 5 folgt…',
    }),
    []
  );

  // Notiz lokal merken (damit nichts verloren geht, auch ohne Speichern-Button)
  const LS_KEY = 'as-courage.notes.v1';
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v) setNote(v);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, note);
    } catch {}
  }, [note]);

  function onClear() {
    setNote('');
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    textareaRef.current?.focus();
  }

  function onSaveDownload() {
    const text =
      `Thema der Woche – ${temaLabel}\n\n` +
      `Thema: ${temaLabel}\n\n` +
      `Zitat: ${quote}\n\n` +
      `Tagesimpulse:\n` +
      `Mo: ${questions.Mo}\n` +
      `Di: ${questions.Di}\n` +
      `Mi: ${questions.Mi}\n` +
      `Do: ${questions.Do}\n` +
      `Fr: ${questions.Fr}\n\n` +
      `Notizen:\n${note}\n\n` +
      `---\n` +
      `App „Thema der Woche“ erstellt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | www.as-courage.de | Email: kontakt@as-courage.de\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Thema-der-Woche_Notizen_${temaLabel.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onPrint() {
    window.print();
  }

  return (
    <RequireAuth>
      <BackgroundLayout>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
          <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Notizen</h1>
                <p className="mt-1 text-sm text-slate-700">
                  Zu deinem aktuellen Thema – speichern, löschen oder drucken.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSaveDownload}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="cursor-pointer rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
                >
                  Löschen
                </button>
                <button
                  type="button"
                  onClick={onPrint}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  Drucken
                </button>
              </div>
            </div>
          </div>

          {/* Druckbereich */}
          <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md print:shadow-none print:bg-white">
            <h2 className="text-xl font-semibold text-slate-900">{`Thema der Woche – ${temaLabel}`}</h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Thema</div>
                <div className="mt-1 text-sm text-slate-800">{temaLabel}</div>

                <div className="mt-4 text-sm font-medium text-slate-900">Zitat</div>
                <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{quote}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Tagesimpulse</div>
                <ul className="mt-2 space-y-2 text-sm text-slate-800">
                  <li><span className="font-semibold">Mo:</span> {questions.Mo}</li>
                  <li><span className="font-semibold">Di:</span> {questions.Di}</li>
                  <li><span className="font-semibold">Mi:</span> {questions.Mi}</li>
                  <li><span className="font-semibold">Do:</span> {questions.Do}</li>
                  <li><span className="font-semibold">Fr:</span> {questions.Fr}</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Persönliche Notizen</div>
              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Schreibe hier deine Notizen…"
                className="mt-2 min-h-[240px] w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 print:min-h-[400px]"
              />
            </div>

            <div className="mt-4 text-xs text-slate-600 print:mt-8 print:text-slate-700">
              App „Thema der Woche“ erstellt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | www.as-courage.de | Email:
              kontakt@as-courage.de
            </div>
          </div>
        </div>
      </BackgroundLayout>
    </RequireAuth>
  );
}