'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import BackgroundLayout from '@/components/BackgroundLayout';
import edition1 from '@/app/data/edition1.json';
import { useSearchParams } from 'next/navigation';

type DayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr';

type ThemeQuestions = Record<DayKey, string>;

type EditionRow = {
  id: string;
  title?: string;
  quote?: string;
  questions?: string[] | Partial<Record<DayKey, string>>;
};

type NotesRun = {
  runId: string;
  weekStartIso: string;
  weekEndIso: string;
  notes: string;
  createdAt: string;
  updatedAt?: string;
  importedLegacy?: boolean;
};

const DAY_KEYS: DayKey[] = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const DEFAULT_QUESTIONS: ThemeQuestions = {
  Mo: 'Frage 1 folgt…',
  Di: 'Frage 2 folgt…',
  Mi: 'Frage 3 folgt…',
  Do: 'Frage 4 folgt…',
  Fr: 'Frage 5 folgt…',
};

const LS_SETUP_KEY = 'as-courage.themeSetup.v1';
const LS_NOTE_KEY_BASE_V1 = 'as-courage.notes.v1';
const LS_NOTE_KEY_V2 = 'as-courage.notes.v2';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateDE(date: Date): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function formatDateRange(startIso?: string | null, endIso?: string | null): string {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);

  if (!start && !end) return 'Datum unbekannt';
  if (start && !end) return formatDateDE(start);
  if (!start && end) return formatDateDE(end);

  return `${formatDateDE(start as Date)} – ${formatDateDE(end as Date)}`;
}

function prettifyId(id: string): string {
  const cleaned = id.replace(/^ed\d+-\d+-/i, '').replace(/-/g, ' ').trim();
  if (!cleaned) return 'Thema';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(theme: { id: string; title?: string }): string {
  const title = theme.title?.trim();
  return title && title.length > 0 ? title : prettifyId(theme.id);
}

function createRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortRunsAscending(a: NotesRun, b: NotesRun): number {
  const byWeek = a.weekStartIso.localeCompare(b.weekStartIso);
  if (byWeek !== 0) return byWeek;
  return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
}

function sortRunsDescending(a: NotesRun, b: NotesRun): number {
  return sortRunsAscending(b, a);
}

function normalizeQuestions(input: unknown): ThemeQuestions {
  const next: ThemeQuestions = { ...DEFAULT_QUESTIONS };

  if (Array.isArray(input)) {
    next.Mo = typeof input[0] === 'string' ? input[0] : next.Mo;
    next.Di = typeof input[1] === 'string' ? input[1] : next.Di;
    next.Mi = typeof input[2] === 'string' ? input[2] : next.Mi;
    next.Do = typeof input[3] === 'string' ? input[3] : next.Do;
    next.Fr = typeof input[4] === 'string' ? input[4] : next.Fr;
    return next;
  }

  if (input && typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    next.Mo = typeof obj.Mo === 'string' ? obj.Mo : typeof obj.mo === 'string' ? obj.mo : next.Mo;
    next.Di = typeof obj.Di === 'string' ? obj.Di : typeof obj.di === 'string' ? obj.di : next.Di;
    next.Mi = typeof obj.Mi === 'string' ? obj.Mi : typeof obj.mi === 'string' ? obj.mi : next.Mi;
    next.Do = typeof obj.Do === 'string' ? obj.Do : typeof obj.do === 'string' ? obj.do : next.Do;
    next.Fr = typeof obj.Fr === 'string' ? obj.Fr : typeof obj.fr === 'string' ? obj.fr : next.Fr;
  }

  return next;
}

function readAllNotesV2(): Record<string, NotesRun[]> {
  try {
    const raw = localStorage.getItem(LS_NOTE_KEY_V2);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, NotesRun[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readThemeRuns(themeId: string): NotesRun[] {
  const all = readAllNotesV2();
  const runs = all[themeId];
  return Array.isArray(runs) ? runs : [];
}

function writeThemeRuns(themeId: string, runs: NotesRun[]): void {
  try {
    const all = readAllNotesV2();
    all[themeId] = runs;
    localStorage.setItem(LS_NOTE_KEY_V2, JSON.stringify(all));
  } catch {
    // bewusst leer
  }
}

function readLegacyNote(themeId: string): string {
  try {
    const specific = localStorage.getItem(`${LS_NOTE_KEY_BASE_V1}.${themeId}`);
    if (specific && specific.trim()) return specific;
    const generic = localStorage.getItem(LS_NOTE_KEY_BASE_V1);
    return generic ?? '';
  } catch {
    return '';
  }
}

function buildThemeImageCandidates(themeId: string | null): string[] {
  if (!themeId) return [];
  return [
    `/images/themes/${themeId}.jpg`,
    `/images/themes/${themeId}.jpeg`,
    `/images/themes/${themeId}.png`,
    '/images/demo.jpg',
  ];
}

function NotizenContent() {
  const searchParams = useSearchParams();
  const themeIdFromUrl = searchParams.get('themeId');

  const [storageReady, setStorageReady] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [currentWeekStartIso, setCurrentWeekStartIso] = useState<string | null>(null);
  const [currentWeekEndIso, setCurrentWeekEndIso] = useState<string | null>(null);

  const [displayThemeLabel, setDisplayThemeLabel] = useState('Thema');
  const [quote, setQuote] = useState('Zitat folgt…');
  const [questions, setQuestions] = useState<ThemeQuestions>(DEFAULT_QUESTIONS);

  const [runs, setRuns] = useState<NotesRun[]>([]);
  const [themeImageIndex, setThemeImageIndex] = useState(0);

  const themeImageCandidates = useMemo(() => buildThemeImageCandidates(activeThemeId), [activeThemeId]);
  const themeImageSrc = themeImageCandidates[themeImageIndex] ?? null;

  useEffect(() => {
    setThemeImageIndex(0);
  }, [activeThemeId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_SETUP_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};

      const selectedThemeIds = Array.isArray(parsed?.themeIds) ? parsed.themeIds.map(String) : [];
      const resolvedThemeId =
        themeIdFromUrl ??
        (selectedThemeIds.length > 0 ? selectedThemeIds[0] : null) ??
        (typeof parsed?.selectedThemeId === 'string' ? parsed.selectedThemeId : null) ??
        (typeof parsed?.themeId === 'string' ? parsed.themeId : null) ??
        null;

      let weekStartIso: string | null = null;
      let weekEndIso: string | null = null;

      const startMonday =
        typeof parsed?.startMonday === 'string' && parsed.startMonday.length === 10
          ? parsed.startMonday
          : null;

      if (resolvedThemeId && startMonday && selectedThemeIds.length > 0) {
        const idx = selectedThemeIds.findIndex((id) => String(id) === String(resolvedThemeId));
        if (idx >= 0) {
          const monday = addDays(new Date(`${startMonday}T00:00:00`), idx * 7);
          const friday = addDays(monday, 4);
          weekStartIso = toIsoDate(monday);
          weekEndIso = toIsoDate(friday);
        }
      }

      setActiveThemeId(resolvedThemeId ? String(resolvedThemeId) : null);
      setCurrentWeekStartIso(weekStartIso);
      setCurrentWeekEndIso(weekEndIso);
    } catch {
      setActiveThemeId(themeIdFromUrl);
      setCurrentWeekStartIso(null);
      setCurrentWeekEndIso(null);
    } finally {
      setStorageReady(true);
    }
  }, [themeIdFromUrl]);

  useEffect(() => {
    if (!storageReady || !activeThemeId) return;

    const themes = edition1 as unknown as EditionRow[];

    const found =
      themes.find((t) => t?.id === activeThemeId) ||
      themes.find((t) => String(t?.id) === String(activeThemeId)) ||
      null;

    if (!found) {
      setDisplayThemeLabel(prettifyId(activeThemeId));
      setQuote('Zitat folgt…');
      setQuestions(DEFAULT_QUESTIONS);
      return;
    }

    setDisplayThemeLabel(displayTitle(found));
    setQuote(typeof found.quote === 'string' && found.quote.trim() ? found.quote : 'Zitat folgt…');
    setQuestions(normalizeQuestions(found.questions));
  }, [storageReady, activeThemeId]);

  useEffect(() => {
    if (!storageReady || !activeThemeId) return;

    let nextRuns = readThemeRuns(activeThemeId);

    const legacyNote = readLegacyNote(activeThemeId).trim();

    if (nextRuns.length === 0 && legacyNote) {
      const fallbackStartIso = currentWeekStartIso ?? toIsoDate(new Date());
      const fallbackEndIso =
        currentWeekEndIso ?? toIsoDate(addDays(parseIsoDate(fallbackStartIso) ?? new Date(), 4));

      nextRuns = [
        {
          runId: createRunId(),
          weekStartIso: fallbackStartIso,
          weekEndIso: fallbackEndIso,
          notes: legacyNote,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          importedLegacy: true,
        },
      ];
    }

    if (currentWeekStartIso && currentWeekEndIso) {
      const hasCurrentRun = nextRuns.some(
        (run) =>
          run.weekStartIso === currentWeekStartIso && run.weekEndIso === currentWeekEndIso,
      );

      if (!hasCurrentRun) {
        nextRuns = [
          ...nextRuns,
          {
            runId: createRunId(),
            weekStartIso: currentWeekStartIso,
            weekEndIso: currentWeekEndIso,
            notes: '',
            createdAt: new Date().toISOString(),
          },
        ];
      }
    }

    nextRuns = [...nextRuns].sort(sortRunsAscending);
    writeThemeRuns(activeThemeId, nextRuns);
    setRuns(nextRuns);
  }, [storageReady, activeThemeId, currentWeekStartIso, currentWeekEndIso]);

  function updateRunNotes(runId: string, value: string) {
    setRuns((prev) => {
      const next = prev.map((run) =>
        run.runId === runId
          ? {
            ...run,
            notes: value,
            updatedAt: new Date().toISOString(),
          }
          : run,
      );

      if (activeThemeId) writeThemeRuns(activeThemeId, next);
      return next;
    });
  }

  function deleteRun(runId: string) {
    const confirmed = window.confirm(
      'Diese Notiz wird endgültig aus dem localStorage gelöscht. Möchtest du wirklich fortfahren?',
    );

    if (!confirmed) return;

    setRuns((prev) => {
      const next = prev.filter((run) => run.runId !== runId);
      if (activeThemeId) writeThemeRuns(activeThemeId, next);
      return next;
    });
  }

  function handleSaveDownload() {
    const runNumbersLocal = new Map<string, number>();
    [...runs].sort(sortRunsAscending).forEach((run, index) => {
      runNumbersLocal.set(run.runId, index + 1);
    });

    const displayRunsLocal = [...runs].sort(sortRunsDescending);

    const runLines = displayRunsLocal.flatMap((run) => [
      `${runNumbersLocal.get(run.runId) ?? 1}. Durchlauf | ${formatDateRange(run.weekStartIso, run.weekEndIso)}`,
      run.notes?.trim() ? run.notes : '—',
      '',
    ]);

    const text =
      `Thema der Woche – ${displayThemeLabel}\n\n` +
      `Thema: ${displayThemeLabel}\n\n` +
      `Zitat: ${quote}\n\n` +
      `Fragen der Woche:\n` +
      `${DAY_KEYS.map((dayKey) => `${dayKey}: ${questions[dayKey]}`).join('\n')}\n\n` +
      `Notizenverlauf:\n` +
      `${runLines.join('\n')}\n`;

    const safeName = String(displayThemeLabel)
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

  function handlePrint(): void {
    window.print();
  }

  const chronologicalRuns = useMemo(() => {
    return [...runs].sort(sortRunsAscending);
  }, [runs]);

  const runNumbers = useMemo(() => {
    const map: Record<string, number> = {};
    chronologicalRuns.forEach((run, index) => {
      map[run.runId] = index + 1;
    });
    return map;
  }, [chronologicalRuns]);

  const currentRun = useMemo(() => {
    if (!currentWeekStartIso || !currentWeekEndIso) return null;
    return (
      runs.find(
        (run) =>
          run.weekStartIso === currentWeekStartIso && run.weekEndIso === currentWeekEndIso,
      ) ?? null
    );
  }, [runs, currentWeekStartIso, currentWeekEndIso]);

  const displayRuns = useMemo(() => {
    const sorted = [...runs].sort(sortRunsDescending);

    if (!currentRun) return sorted;

    const others = sorted.filter((run) => run.runId !== currentRun.runId);
    return [currentRun, ...others];
  }, [runs, currentRun]);

  if (!storageReady) {
    return (
      <BackgroundLayout>
        <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-4 py-6">
          <div className="rounded-2xl bg-white/90 px-6 py-5 shadow-xl backdrop-blur-md">
            <p className="text-base font-semibold text-slate-900">Notizen werden geladen …</p>
          </div>
        </div>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-6 print:px-0 print:py-0">
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/95 shadow-xl backdrop-blur print:rounded-none print:border-0 print:bg-white print:shadow-none">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-orange-50 px-5 py-5 sm:px-7 print:bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notizenverlauf
                </p>
                <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {displayThemeLabel}
                </h1>

                {currentRun ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Das Thema wurde zum {runNumbers[currentRun.runId] ?? 1}. Mal gewählt.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    Neue Wochen werden ergänzt, alte Inhalte werden nicht überschrieben.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveDownload}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                >
                  Speichern
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                >
                  Drucken
                </button>

                <Link
                  href={themeIdFromUrl ? `/quotes?themeId=${encodeURIComponent(themeIdFromUrl)}` : '/quotes'}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md"
                >
                  zurück
                </Link>
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.95fr] lg:grid-rows-[auto_auto] lg:items-stretch print:grid-cols-1">
              {themeImageSrc ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-3 sm:p-4 lg:h-[440px] print:h-auto">
                  <div className="flex h-full items-center justify-center">
                    <img
                      src={themeImageSrc}
                      alt={displayThemeLabel}
                      className="block max-h-full max-w-full object-contain"
                      onError={() => {
                        setThemeImageIndex((current) => current + 1);
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-base">
                  Fragen der Woche
                </p>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {DAY_KEYS.map((dayKey, index) => (
                    <div
                      key={dayKey}
                      className={`grid grid-cols-[56px_1fr] gap-3 px-4 py-3 ${index !== DAY_KEYS.length - 1 ? 'border-b border-slate-200' : ''
                        }`}
                    >
                      <p className="text-sm font-semibold text-slate-500">{dayKey}</p>
                      <p className="text-sm leading-6 text-slate-800">{questions[dayKey]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 sm:px-6 lg:col-span-2">
                <p className="text-base leading-8 text-slate-800 sm:text-lg">
                  <span className="font-semibold text-slate-500">Zitat - </span>
                  {quote.replace(/\s*\n+\s*/g, ' ').trim()}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-7 sm:py-7">
            <div className="space-y-5">
              {displayRuns.length === 0 ? (
                <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 text-sm text-slate-600">
                  Für dieses Thema liegt noch kein Notizdurchlauf vor.
                </div>
              ) : (
                displayRuns.map((run) => {
                  const isCurrentRun = currentRun?.runId === run.runId;

                  return (
                    <section
                      key={run.runId}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:px-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                                {runNumbers[run.runId] ?? 1}. Durchlauf
                              </h2>

                              {isCurrentRun ? (
                                <span className="rounded-full bg-[#F29420] px-3 py-1 text-xs font-semibold text-black">
                                  aktueller Durchlauf
                                </span>
                              ) : null}

                              {run.importedLegacy ? (
                                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                                  aus alter Notiz übernommen
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 text-sm font-medium text-slate-600">
                              {formatDateRange(run.weekStartIso, run.weekEndIso)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteRun(run.runId)}
                            className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md"
                          >
                            Löschen
                          </button>
                        </div>
                      </div>

                      <div className="px-5 py-5 sm:px-6">
                        <textarea
                          value={run.notes}
                          onChange={(e) => updateRunNotes(run.runId, e.target.value)}
                          placeholder="Schreibe hier deine Notizen…"
                          className="min-h-[220px] w-full rounded-[24px] border border-slate-300 bg-white p-4 text-base text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 print:hidden"
                        />

                        <div className="hidden whitespace-pre-wrap rounded-[24px] border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 print:block">
                          {run.notes?.trim() ? run.notes : '—'}
                        </div>
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </BackgroundLayout>
  );
}

export default function NotizenPage() {
  return (
    <Suspense fallback={null}>
      <NotizenContent />
    </Suspense>
  );
}