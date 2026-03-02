'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import RequireAuth from '@/components/RequireAuth';
import edition1 from '@/app/data/edition1.json';
import { useSearchParams } from 'next/navigation';

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr';

const DEFAULT_QUESTIONS: Record<DayKey, string> = {
  Mo: 'Frage 1 folgt…',
  Di: 'Frage 2 folgt…',
  Mi: 'Frage 3 folgt…',
  Do: 'Frage 4 folgt…',
  Fr: 'Frage 5 folgt…',
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatDateDEshort(d: Date) {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = pad2(d.getFullYear() % 100);
  return `${dd}.${mm}.${yy}`; // 02.03.26
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function NotizenContent() {
  const searchParams = useSearchParams();
  const themeIdFromUrl = searchParams.get('themeId');

  const [note, setNote] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [temaLabel, setTemaLabel] = useState('Thema');
  const [quote, setQuote] = useState('Zitat folgt…');
  const [questions, setQuestions] =
    useState<Record<DayKey, string>>(DEFAULT_QUESTIONS);

  const LS_NOTE_KEY = 'as-courage.notes.v1';

  // Notiz lokal laden
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_NOTE_KEY);
      if (v) setNote(v);
    } catch { }
  }, []);

  // Notiz lokal speichern
  useEffect(() => {
    try {
      localStorage.setItem(LS_NOTE_KEY, note);
    } catch { }
  }, [note]);

  const { activeThemeId, weekStart } = useMemo(() => {
    try {
      const raw = localStorage.getItem('as-courage.themeSetup.v1');
      if (!raw) return { activeThemeId: null as any, weekStart: null as Date | null };

      const parsed: any = JSON.parse(raw);

      const active =
        themeIdFromUrl ??
        (Array.isArray(parsed?.themeIds) ? parsed.themeIds[0] : null) ??
        parsed?.selectedThemeId ??
        parsed?.themeId ??
        parsed?.theme?.id ??
        parsed?.selectedTheme?.id ??
        null;

      // Woche berechnen: startMonday + (Index in themeIds) * 7
      let ws: Date | null = null;
      const startMondayStr: string | undefined = parsed?.startMonday;
      const themeIds: any[] = Array.isArray(parsed?.themeIds) ? parsed.themeIds : [];

      if (startMondayStr && typeof startMondayStr === 'string' && themeIds.length > 0 && active) {
        const idx = themeIds.findIndex((id) => String(id) === String(active));
        if (idx >= 0) {
          const start = new Date(startMondayStr + 'T00:00:00');
          if (!Number.isNaN(start.getTime())) {
            ws = addDays(start, idx * 7);
          }
        }
      }

      return { activeThemeId: active, weekStart: ws };
    } catch {
      return { activeThemeId: null as any, weekStart: null as Date | null };
    }
  }, [themeIdFromUrl]);

  const dayLabels = useMemo(() => {
    const days: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    const labels: Record<DayKey, string> = { Mo: 'Mo', Di: 'Di', Mi: 'Mi', Do: 'Do', Fr: 'Fr' };

    if (!weekStart) {
      // trotzdem Komma, damit die Textstarts bündig werden
      labels.Mo = 'Mo';
      labels.Di = 'Di';
      labels.Mi = 'Mi';
      labels.Do = 'Do';
      labels.Fr = 'Fr';
      return labels;
    }

    days.forEach((k, i) => {
      const d = addDays(weekStart, i);
      labels[k] = `${k}, ${formatDateDEshort(d)}`;
    });

    return labels;
  }, [weekStart]);

  // Thema / Zitat / Fragen laden
  useEffect(() => {
    try {
      const themeIdOrNr = activeThemeId;

      const themes: any[] =
        (edition1 as any)?.themes ??
        (edition1 as any)?.data ??
        (edition1 as any) ??
        [];

      const found: any =
        themes.find((t) => t?.id === themeIdOrNr) ||
        themes.find((t) => t?.nr === themeIdOrNr) ||
        themes.find((t) => t?.number === themeIdOrNr) ||
        themes.find((t) => String(t?.id) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.nr) === String(themeIdOrNr)) ||
        themes.find((t) => String(t?.number) === String(themeIdOrNr));

      if (!found) return;

      const label =
        String(
          found?.title ??
          found?.name ??
          found?.thema ??
          found?.label ??
          found?.id ??
          'Thema'
        ) || 'Thema';

      const zitat =
        found?.quote ?? found?.zitat ?? found?.Zitat ?? 'Zitat folgt…';

      const q =
        found?.questions ??
        found?.impulses ??
        found?.tagesimpulse ??
        found?.days ??
        found?.weekdays ??
        null;

      const nextQuestions: Record<DayKey, string> = { ...DEFAULT_QUESTIONS };

      if (Array.isArray(q)) {
        nextQuestions.Mo = q[0] ?? nextQuestions.Mo;
        nextQuestions.Di = q[1] ?? nextQuestions.Di;
        nextQuestions.Mi = q[2] ?? nextQuestions.Mi;
        nextQuestions.Do = q[3] ?? nextQuestions.Do;
        nextQuestions.Fr = q[4] ?? nextQuestions.Fr;
      } else if (q && typeof q === 'object') {
        nextQuestions.Mo =
          (q as any).Mo ?? (q as any).mo ?? (q as any).monday ?? nextQuestions.Mo;
        nextQuestions.Di =
          (q as any).Di ?? (q as any).di ?? (q as any).tuesday ?? nextQuestions.Di;
        nextQuestions.Mi =
          (q as any).Mi ?? (q as any).mi ?? (q as any).wednesday ?? nextQuestions.Mi;
        nextQuestions.Do =
          (q as any).Do ?? (q as any).do ?? (q as any).thursday ?? nextQuestions.Do;
        nextQuestions.Fr =
          (q as any).Fr ?? (q as any).fr ?? (q as any).friday ?? nextQuestions.Fr;
      }

      setTemaLabel(label);
      setQuote(String(zitat ?? 'Zitat folgt…'));
      setQuestions(nextQuestions);
    } catch {
      // still
    }
  }, [activeThemeId]);

  function onClear() {
    setNote('');
    try {
      localStorage.removeItem(LS_NOTE_KEY);
    } catch { }
    textareaRef.current?.focus();
  }

  function onSaveDownload() {
    const text =
      `Thema der Woche – ${temaLabel}\n\n` +
      `Thema: ${temaLabel}\n\n` +
      `Zitat: ${quote}\n\n` +
      `Tagesimpulse:\n` +
      `${dayLabels.Mo}, ${questions.Mo}\n` +
      `${dayLabels.Di}, ${questions.Di}\n` +
      `${dayLabels.Mi}, ${questions.Mi}\n` +
      `${dayLabels.Do}, ${questions.Do}\n` +
      `${dayLabels.Fr}, ${questions.Fr}\n\n` +
      `Notizen:\n${note}\n\n` +
      `---\n` +
      `Projekt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | www.thema-der-woche.com | mailto: (t.b.d.)\n`;

    const safeName = String(temaLabel)
      .replace(/\s+/g, '_')
      .replace(/[^\w\-äöüÄÖÜß]/g, '');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Thema-der-Woche_Notizen_${safeName || 'Thema'}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function onPrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 12mm 18mm 12mm; /* unten Platz für Footer */
          }

          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body { background-image: none !important; }
.print-page-bg { display: none !important; }
          * {
            box-shadow: none !important;
            filter: none !important;
            backdrop-filter: none !important;
          }

          /* Buttons/Links/Navi im Inhalt ausblenden */
          button, nav, .screen-only {
            display: none !important;
          }

          /* Layout im Druck immer zweispaltig für Thema/Zitat vs Tagesimpulse */
          .two-col {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }

          /* Print-Notizen: als Fließtext druckbar (mehrere Seiten möglich) */
          .print-note-box {
            white-space: pre-wrap;
            overflow: visible !important;
          }

          .print-footer {
            display: block !important;
            position: fixed;
            left: 0;
            right: 0;
            bottom: 6mm;
            font-size: 10px;
            color: #334155;
            text-align: center;
          }

          /* Hinweis: Chrome liefert hier keine zuverlässigen Page-Counter in HTML */
          .print-footer .pagehint {
            margin-left: 6px;
            opacity: 0.9;
          }
        }

        /* Print-Footer am Screen verstecken */
        .print-footer {
  display: block !important;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 6mm;
  font-size: 10px;
  color: #334155;
  text-align: center;
  background: white;
  z-index: 9999;
  padding: 2mm 4mm;
}
      `}</style>

      <BackgroundLayout>
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4">
          {/* Header + Buttons */}
          <div className="screen-only rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-3">
                  <Link
                    href="/quotes"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition hover:bg-slate-50"
                  >
                    ← Zurück zu den Tagesimpulsen
                  </Link>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Notizen
                </h1>
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

          {/* Inhalt */}
          <div className="rounded-2xl bg-white/85 p-5 shadow-xl backdrop-blur-md print:bg-white print:shadow-none print:backdrop-blur-none print:p-5 print:rounded-2xl">
            <h2 className="text-2xl font-semibold text-slate-900">{`Thema der Woche – ${temaLabel}`}</h2>

            {/* Thema/Zitat + Tagesimpulse nebeneinander (Screen & Print) */}
            <div className="two-col mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Thema</div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {temaLabel}
                </div>

                <div className="mt-4 text-sm font-medium text-slate-900">Zitat</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                  {quote}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-medium text-slate-900">Tagesimpulse</div>
                <ul className="mt-2 space-y-2 text-sm text-slate-800">
                  {(['Mo', 'Di', 'Mi', 'Do', 'Fr'] as DayKey[]).map((k) => (
                    <li key={k} className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="font-semibold whitespace-nowrap">{dayLabels[k]}</span>
                      <span>{questions[k]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Notizen: Screen = textarea, Print = Fließtext (damit kurze Notizen 1 Seite bleiben) */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-medium text-slate-900">Persönliche Notizen</div>

              <textarea
                ref={textareaRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Schreibe hier deine Notizen…"
                className="screen-only mt-2 min-h-[240px] w-full rounded-xl border border-slate-300 bg-white p-3 text-base text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
              />

              <div className="print-note-box mt-2 hidden rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 print:block">
                {note?.trim() ? note : '—'}
              </div>
            </div>
          </div>

          {/* Footer nur im Druck (mit Links). Seitenzahlen: bitte in Chrome „Kopf- und Fußzeilen“ aktivieren */}
          <div className="print-footer">
            <span>Projekt von Andreas Sedlag, Kompetenztrainer und systemischer Coach | </span>
            <a href="https://www.thema-der-woche.com">www.thema-der-woche.com</a>
            <span> | </span>
            <a href="mailto:t.b.d.">mailto: (t.b.d.)</a>
            <span className="pagehint"> | Seitenzahl: </span>
          </div>
        </div>
      </BackgroundLayout>
    </>
  );
}

export default function NotizenPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <NotizenContent />
      </Suspense>
    </RequireAuth>
  );
}