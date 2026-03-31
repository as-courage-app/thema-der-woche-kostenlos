'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackgroundLayout from '../../components/BackgroundLayout';
import DetailsMenu from './DetailsMenu';
import edition1 from '../data/edition1.json';
import Link from 'next/link';
import PodcastMiniPlayer from '../../components/PodcastMiniPlayer';
import { podcastEpisodes } from '../../lib/podcastEpisodes';
import RequireAuth from '@/components/RequireAuth';
import { getAppMode } from '@/lib/appMode';
import MediathekMenu from './MediathekMenu';
import { EmbeddedNotesHistoryCard } from '@/components/notes/NotesHistoryCard';

const LS_SETUP = 'as-courage.themeSetup.v1';
const LS_INLINE_ICAL_DRAFTS = 'as-courage.inlineIcalDrafts.v1';
const ICAL_EDITOR_ROUTE = '/ical-editor';

type EditionRow = {
  id: string;
  title?: string;
  quote: string;
  questions: string[];
};

type SetupState = {
  edition?: number;
  weeksCount?: number;
  startMonday?: string;
  mode?: 'manual' | 'random';
  themeIds?: string[];
  createdAt?: string;
  icalEnabled?: boolean;
};

type BottomSectionKey = 'notes' | 'ical';

type EditableDayKey = 'Mo' | 'Di' | 'Mi' | 'Do' | 'Fr' | 'Sa' | 'So';

type InlineIcalWeekDraft = {
  themeId: string;
  weekIndex: number;
  startMondayIso: string;
  savedAt: string;
  days: Record<EditableDayKey, string>;
};

type InlineIcalDraftMap = Record<string, InlineIcalWeekDraft>;

type InlineIcalDayRow = {
  key: EditableDayKey;
  label: string;
  index: number;
  dateIso: string;
  dateText: string;
  text: string;
  defaultText: string;
};

const THEMES: EditionRow[] = edition1 as unknown as EditionRow[];

const BRAND_ORANGE = '#F3910A';

const WEEKDAYS = [
  { key: 'Mo', label: 'Montag', index: 0 },
  { key: 'Di', label: 'Dienstag', index: 1 },
  { key: 'Mi', label: 'Mittwoch', index: 2 },
  { key: 'Do', label: 'Donnerstag', index: 3 },
  { key: 'Fr', label: 'Freitag', index: 4 },
];

const EDITABLE_DAYS: Array<{ key: EditableDayKey; label: string; index: number }> = [
  { key: 'Mo', label: 'Montag', index: 0 },
  { key: 'Di', label: 'Dienstag', index: 1 },
  { key: 'Mi', label: 'Mittwoch', index: 2 },
  { key: 'Do', label: 'Donnerstag', index: 3 },
  { key: 'Fr', label: 'Freitag', index: 4 },
  { key: 'Sa', label: 'Samstag', index: 5 },
  { key: 'So', label: 'Sonntag', index: 6 },
];

function readSetup(): SetupState | null {
  try {
    const possibleKeys = [
      LS_SETUP,
      'as-courage.themeSetup',
      'themeSetup',
      'setup',
      'as-courage.setup.v1',
    ];

    for (const k of possibleKeys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as SetupState;
      if (parsed && typeof parsed === 'object') return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

function readInlineIcalDrafts(): InlineIcalDraftMap {
  try {
    const raw = localStorage.getItem(LS_INLINE_ICAL_DRAFTS);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as InlineIcalDraftMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeInlineIcalDrafts(drafts: InlineIcalDraftMap) {
  try {
    localStorage.setItem(LS_INLINE_ICAL_DRAFTS, JSON.stringify(drafts));
  } catch {
    // bewusst still
  }
}

function parseIsoDate(iso?: string): Date | null {
  if (!iso || iso.length !== 10) return null;
  const d = new Date(iso + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDE(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function prettifyId(id: string): string {
  const cleaned = id
    .replace(/^ed\d+-\d+-/i, '')
    .replace(/^ed\d+\s*/i, '')
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ')
    .trim();

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function displayTitle(row: EditionRow): string {
  const t = row.title?.trim();
  return t && t.length > 0 ? t : prettifyId(row.id);
}

function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function yyyymmdd(d: Date) {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

function escapeIcsText(s: string) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function dtstampUtc() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = pad2(now.getUTCMonth() + 1);
  const d = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const mm = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function buildWeekDraftStorageKey(themeId: string, weekIndex: number, startMondayIso: string) {
  return `${startMondayIso}__${weekIndex}__${themeId}`;
}

function buildInlineIcalRows(
  theme: EditionRow,
  weekMonday: Date,
  savedDraft?: InlineIcalWeekDraft
): InlineIcalDayRow[] {
  return EDITABLE_DAYS.map((day) => {
    const currentDate = addDays(weekMonday, day.index);
    const defaultText =
      day.index <= 4 ? theme.questions?.[day.index] ?? '' : 'Schönes Wochenende';

    return {
      key: day.key,
      label: day.label,
      index: day.index,
      dateIso: formatIsoDate(currentDate),
      dateText: formatDE(currentDate),
      text: savedDraft?.days?.[day.key] ?? defaultText,
      defaultText,
    };
  });
}

function buildIcsFromPlan(
  setup: SetupState | null,
  selectedThemes: EditionRow[],
  inlineDrafts: InlineIcalDraftMap
): string {
  const stamp = dtstampUtc();
  const uidBase = `tdw-${stamp}-${Math.random().toString(16).slice(2)}`;

  const weeksCount = setup?.weeksCount ?? 0;
  const startIso = setup?.startMonday;

  const baseDate = parseIsoDate(startIso);
  if (!baseDate || weeksCount < 1 || selectedThemes.length === 0 || !startIso) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//as-courage//Thema der Woche//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'END:VCALENDAR',
      '',
    ].join('\r\n');
  }

  const countWeeks = Math.min(weeksCount, selectedThemes.length);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//as-courage//Thema der Woche//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  let eventIndex = 0;

  for (let w = 0; w < countWeeks; w++) {
    const theme = selectedThemes[w];
    const weekMonday = addDays(baseDate, w * 7);
    const title = displayTitle(theme);
    const quote = theme.quote ?? '';
    const draftKey = buildWeekDraftStorageKey(theme.id, w, startIso);
    const savedDraft = inlineDrafts[draftKey];
    const weekRows = buildInlineIcalRows(theme, weekMonday, savedDraft);

    for (const row of weekRows) {
      const currentDate = addDays(weekMonday, row.index);
      const dtStart = yyyymmdd(currentDate);
      const dtEnd = yyyymmdd(addDays(currentDate, 1));
      const text = row.text?.trim() || row.defaultText;

      const summary =
        row.index <= 4 ? `${title}: ${text || 'Tagesimpuls'}` : text || 'Schönes Wochenende';

      const desc =
        row.index <= 4
          ? `Thema: ${title}\nZitat: ${quote}\nTag: ${row.label}\nDatum: ${row.dateText}\nTagesimpuls: ${text}`
          : `Thema: ${title}\nTag: ${row.label}\nDatum: ${row.dateText}\nEintrag: ${text}`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uidBase}-${eventIndex}@as-courage`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('TRANSP:TRANSPARENT');
      lines.push(`SUMMARY:${escapeIcsText(summary)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
      lines.push('END:VEVENT');

      eventIndex++;
    }
  }

  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}

type IcalMenuProps = {
  onDirectDownload: () => void;
  onQuickEdit: () => void;
  onEditorOpen: () => void;
};

function IcalMenu({ onDirectDownload, onQuickEdit, onEditorOpen }: IcalMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleWindowFocus() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg"
        title="iCal öffnen"
      >
        <span aria-hidden="true" className="text-base leading-none">
          📅
        </span>
        iCal
        <span aria-hidden="true" className="text-xs leading-none">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDirectDownload();
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
          >
            <span>iCal direkt herunterladen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onQuickEdit();
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
          >
            <span>Aktuelle Woche schnell bearbeiten</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEditorOpen();
            }}
            className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left text-sm text-slate-900 transition hover:bg-slate-50"
          >
            <span>Mehrere Wochen im iCal-Editor bearbeiten</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function QuotesPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [activeDay, setActiveDay] = useState<Record<string, number>>({});
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [appMode, setAppMode] = useState<'free' | 'full' | null>(null);
  const AuthWrapper = appMode === 'full' ? RequireAuth : React.Fragment;

  const [imgFallbackToDemo, setImgFallbackToDemo] = useState<boolean>(false);
  const [showPodcast, setShowPodcast] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showInlineIcal, setShowInlineIcal] = useState(false);
  const [podcastNotice, setPodcastNotice] = useState<string | null>(null);
  const [bottomSectionOrder, setBottomSectionOrder] = useState<BottomSectionKey[]>([]);
  const [savedInlineIcalDrafts, setSavedInlineIcalDrafts] = useState<InlineIcalDraftMap>({});
  const [inlineIcalRows, setInlineIcalRows] = useState<InlineIcalDayRow[]>([]);
  const [inlineIcalSaved, setInlineIcalSaved] = useState(false);

  const notesBlockRef = useRef<HTMLDivElement | null>(null);
  const icalBlockRef = useRef<HTMLDivElement | null>(null);
  const pendingNotesScrollRef = useRef(false);
  const pendingIcalScrollRef = useRef(false);

  useEffect(() => {
    const themeIdFromUrl = new URLSearchParams(window.location.search).get('themeId');
    const s = readSetup();
    const mode = getAppMode();

    setSetup(s);
    setAppMode(mode);
    setSavedInlineIcalDrafts(readInlineIcalDrafts());

    const ids = s?.themeIds ?? [];
    const initialDays: Record<string, number> = {};
    for (const id of ids) initialDays[id] = 0;
    setActiveDay(initialDays);

    const initialIndex = themeIdFromUrl ? ids.findIndex((id) => id === themeIdFromUrl) : -1;
    setPageIndex(initialIndex >= 0 ? initialIndex : 0);
    setImgFallbackToDemo(false);
  }, []);

  useEffect(() => {
    if (!showNotes) return;
    if (!pendingNotesScrollRef.current) return;

    const node = notesBlockRef.current;
    if (!node) return;

    pendingNotesScrollRef.current = false;

    requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [showNotes]);

  useEffect(() => {
    if (!showInlineIcal) return;
    if (!pendingIcalScrollRef.current) return;

    const node = icalBlockRef.current;
    if (!node) return;

    pendingIcalScrollRef.current = false;

    requestAnimationFrame(() => {
      node.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [showInlineIcal]);

  const selectedThemes = useMemo(() => {
    const ids = setup?.themeIds;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return [];

    const map = new Map<string, EditionRow>();
    for (const t of THEMES) map.set(t.id, t);

    return ids.map((id) => map.get(id)).filter(Boolean) as EditionRow[];
  }, [setup]);

  const totalPages = selectedThemes.length;
  const clampedIndex = totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0;
  const current: EditionRow | null = totalPages > 0 ? selectedThemes[clampedIndex] : null;

  const currentThemeNumber = useMemo(() => {
    const id = current?.id ?? '';
    const m = id.match(/-(\d{1,2})-/);
    return m ? Number(m[1]) : null;
  }, [current?.id]);

  const currentEpisode = useMemo(() => {
    if (!currentThemeNumber) return null;
    return podcastEpisodes.find((ep) => ep.themeNumber === currentThemeNumber) ?? null;
  }, [currentThemeNumber]);

  const podcastAllowed = currentThemeNumber !== null && currentThemeNumber <= 4;
  const podcastReady = !!currentEpisode && currentThemeNumber !== null;

  const weekMondayDate = useMemo(() => {
    const base = parseIsoDate(setup?.startMonday);
    if (!base) return null;
    return addDays(base, clampedIndex * 7);
  }, [setup?.startMonday, clampedIndex]);

  const weekdayDateText = useMemo(() => {
    if (!weekMondayDate) return (index: number) => '';
    return (index: number) => formatDE(addDays(weekMondayDate, index));
  }, [weekMondayDate]);

  const dateRangeText = useMemo(() => {
    const base = parseIsoDate(setup?.startMonday);
    if (!base) return '';
    const monday = addDays(base, clampedIndex * 7);
    const friday = addDays(monday, 4);
    return `${formatDE(monday)} – ${formatDE(friday)}`;
  }, [setup?.startMonday, clampedIndex]);

  useEffect(() => {
    if (!current || !weekMondayDate || !setup?.startMonday) {
      setInlineIcalRows([]);
      setInlineIcalSaved(false);
      return;
    }

    const draftKey = buildWeekDraftStorageKey(current.id, clampedIndex, setup.startMonday);
    const savedDraft = savedInlineIcalDrafts[draftKey];

    setInlineIcalRows(buildInlineIcalRows(current, weekMondayDate, savedDraft));
    setInlineIcalSaved(!!savedDraft);
  }, [current, weekMondayDate, clampedIndex, setup?.startMonday, savedInlineIcalDrafts]);

  const dayIndex = current ? activeDay[current.id] ?? 0 : 0;

  const canPrev = clampedIndex > 0;
  const canNext = clampedIndex < totalPages - 1;

  function goPrev() {
    setShowPodcast(false);
    setPageIndex((p) => Math.max(0, p - 1));
    setImgFallbackToDemo(false);
  }

  function goNext() {
    setShowPodcast(false);
    setPageIndex((p) => Math.min(Math.max(0, totalPages - 1), p + 1));
    setImgFallbackToDemo(false);
  }

  const imageSrc = useMemo(() => {
    if (!current) return '/images/demo.jpg';
    if (imgFallbackToDemo) return '/images/demo.jpg';
    return `/images/themes/${current.id}.jpg`;
  }, [current, imgFallbackToDemo]);

  const currentTitle = current ? displayTitle(current) : '';
  const showIcalButton = totalPages > 0;

  const orderedBottomSections = useMemo(() => {
    return bottomSectionOrder.filter((section) => {
      if (section === 'notes') return showNotes && !!current?.id;
      if (section === 'ical') return showInlineIcal;
      return false;
    });
  }, [bottomSectionOrder, showNotes, showInlineIcal, current?.id]);

  const hasBottomSections = orderedBottomSections.length > 0;

  function handleInlineIcalSave() {
    if (!current || !setup?.startMonday) return;

    const draftKey = buildWeekDraftStorageKey(current.id, clampedIndex, setup.startMonday);

    const nextDraft: InlineIcalWeekDraft = {
      themeId: current.id,
      weekIndex: clampedIndex,
      startMondayIso: setup.startMonday,
      savedAt: new Date().toISOString(),
      days: inlineIcalRows.reduce(
        (acc, row) => {
          acc[row.key] = row.text;
          return acc;
        },
        {
          Mo: '',
          Di: '',
          Mi: '',
          Do: '',
          Fr: '',
          Sa: '',
          So: '',
        } as Record<EditableDayKey, string>
      ),
    };

    setSavedInlineIcalDrafts((prev) => {
      const next = {
        ...prev,
        [draftKey]: nextDraft,
      };
      writeInlineIcalDrafts(next);
      return next;
    });

    setInlineIcalSaved(true);
  }

  function handleInlineRowChange(dayKey: EditableDayKey, nextText: string) {
    setInlineIcalRows((prev) =>
      prev.map((row) => (row.key === dayKey ? { ...row, text: nextText } : row))
    );
    setInlineIcalSaved(false);
  }

  function handleDirectIcalDownload() {
    const ics = buildIcsFromPlan(setup, selectedThemes, savedInlineIcalDrafts);
    downloadTextFile('thema-der-woche.ics', ics, 'text/calendar;charset=utf-8');
  }

  return (
    <AuthWrapper>
      <BackgroundLayout activeThemeId={current?.id}>
        <div className="mx-auto flex h-full min-h-[100svh] max-w-6xl px-10 py-3 lg:min-h-0">
          <div className="flex min-h-[100dvh] w-full flex-col overflow-visible rounded-none border border-[#F29420] bg-white/98 shadow-none backdrop-blur-md sm:min-h-0 sm:rounded-2xl sm:bg-white/85 sm:shadow-xl">
            <div className="shrink-0 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Thema der Woche <span className="text-slate-600">(Edition 1)</span>
                  </h1>

                  <div className="mt-2 text-sm text-slate-700">
                    <span className="text-base font-semibold text-[#F29420]">
                      Kostenlose Version
                    </span>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="https://thema-der-woche.vercel.app/account"
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                      title="Zum Upgrade"
                    >
                      zum upgrade
                    </Link>

                    <button
                      type="button"
                      onClick={() => router.push('/themes')}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg"
                    >
                      zurück zur Themenauswahl
                    </button>
                  </div>
                </div>
              </div>

              {podcastNotice ? (
                <div className="mt-3 inline-block max-w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <div className="flex items-start justify-between gap-3">
                    <span>{podcastNotice}</span>
                    <button
                      type="button"
                      onClick={() => setPodcastNotice(null)}
                      className="cursor-pointer rounded-xl border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    >
                      OK
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={!canPrev}
                  className={[
                    'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition duration-200',
                    canPrev
                      ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
                  ].join(' ')}
                >
                  zurück
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canNext}
                  className={[
                    'min-h-[44px] rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition duration-200',
                    canNext
                      ? 'cursor-pointer border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-lg'
                      : 'cursor-not-allowed border-slate-200 bg-white text-slate-400',
                  ].join(' ')}
                >
                  weiter
                </button>

                <MediathekMenu
                  themeId={current?.id}
                  podcastAllowed={podcastAllowed}
                  podcastReady={podcastReady}
                  onPodcastClick={() => {
                    setPodcastNotice(null);
                    if (!podcastAllowed) {
                      setPodcastNotice('Podcast nur für die ersten 4 Themen verfügbar.');
                      return;
                    }
                    if (!podcastReady) {
                      setPodcastNotice('Podcastfolge in Bearbeitung und aktuell nicht verfügbar.');
                      return;
                    }
                    setShowPodcast((s) => !s);
                  }}
                />

                <DetailsMenu themeId={current?.id} />

                {showIcalButton ? (
                  <IcalMenu
                    onDirectDownload={handleDirectIcalDownload}
                    onQuickEdit={() => {
                      pendingIcalScrollRef.current = true;
                      setBottomSectionOrder((prev) =>
                        prev.includes('ical') ? prev : [...prev, 'ical']
                      );
                      setShowInlineIcal(true);
                    }}
                    onEditorOpen={() => router.push(ICAL_EDITOR_ROUTE)}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    if (!showNotes) {
                      pendingNotesScrollRef.current = true;
                      setBottomSectionOrder((prev) =>
                        prev.includes('notes') ? prev : [...prev, 'notes']
                      );
                      setShowNotes(true);
                      return;
                    }

                    pendingNotesScrollRef.current = false;
                    setShowNotes(false);
                    setBottomSectionOrder((prev) =>
                      prev.filter((entry) => entry !== 'notes')
                    );
                  }}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-100 hover:shadow-lg"
                  title="Notizen einblenden oder ausblenden"
                >
                  <span aria-hidden="true" className="text-base leading-none">
                    📝
                  </span>
                  {showNotes ? 'Notizen ausblenden' : 'Notizen einblenden'}
                </button>

                <div className="ml-auto text-sm text-slate-700">
                  {totalPages > 0 ? (
                    <>
                      Thema <span className="font-semibold">{clampedIndex + 1}</span> / {totalPages}
                    </>
                  ) : (
                    <span className="text-slate-600">Noch keine Themen ausgewählt.</span>
                  )}
                </div>
              </div>
            </div>

            {showPodcast && podcastAllowed && currentEpisode ? (
              <PodcastMiniPlayer
                src={currentEpisode.audioSrc}
                title={(() => {
                  const src = currentEpisode.audioSrc || '';
                  const match = src.match(/thema-(\d+)\.mp3$/i);
                  const nr = match ? Number(match[1]) : NaN;

                  if (!Number.isFinite(nr)) return currentEpisode.title;

                  const prefix = `ed1-${String(nr).padStart(2, '0')}-`;
                  const theme = (edition1 as any[]).find((t) =>
                    String(t?.id ?? '').startsWith(prefix)
                  );

                  return theme?.title?.trim() || currentEpisode.title || `Podcast Folge ${nr}`;
                })()}
              />
            ) : null}

            <div
              className={
                hasBottomSections
                  ? 'px-5 pb-5 sm:px-7 sm:pb-7'
                  : 'flex-1 min-h-0 overflow-auto px-5 pb-5 sm:px-7 sm:pb-7 lg:overflow-hidden'
              }
            >
              {!current ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Ich finde noch keine ausgewählten Themen. Bitte gehe zur Themenauswahl und wähle
                  Themen aus.
                </div>
              ) : (
                <>
                  <div
                    className={
                      hasBottomSections
                        ? 'rounded-2xl border border-slate-200 bg-white'
                        : 'rounded-2xl border border-slate-200 bg-white lg:h-full lg:overflow-hidden'
                    }
                  >
                    <div className="flex flex-col lg:flex-row">
                      <div className="relative bg-slate-100 lg:w-1/2">
                        <div className="h-64 lg:h-full">
                          <img
                            src={imageSrc}
                            alt={`Bild zu ${currentTitle}`}
                            className="h-full w-full object-cover object-center"
                            onError={() => setImgFallbackToDemo(true)}
                          />
                        </div>
                      </div>

                      <div className="lg:h-full lg:w-1/2 lg:overflow-auto">
                        <div className="p-5 lg:p-6">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">{currentTitle}</h2>
                            <div className="text-sm text-slate-600">
                              {dateRangeText ? (
                                <span className="font-medium">{dateRangeText}</span>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className="sticky top-0 z-10 mt-3 rounded-xl border-2 bg-slate-50 p-4 shadow-sm"
                            style={{ borderColor: BRAND_ORANGE }}
                          >
                            <div className="text-lg font-semibold tracking-wide text-slate-900">
                              Wochenzitat
                            </div>
                            <div className="mt-2 text-lg leading-relaxed text-slate-900">
                              „{current.quote}“
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
                            {WEEKDAYS.map((d) => (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() =>
                                  setActiveDay((prev) => ({
                                    ...prev,
                                    [current.id]: d.index,
                                  }))
                                }
                                className={[
                                  'w-full cursor-pointer rounded-2xl border px-3 py-2 text-sm shadow-sm transition duration-200',
                                  dayIndex === d.index
                                    ? 'border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-md'
                                    : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-300 hover:bg-slate-50 hover:shadow-md',
                                ].join(' ')}
                              >
                                <span className="flex flex-col items-center leading-tight">
                                  <span className="font-medium">{d.key}</span>
                                  <span className="text-xs opacity-80">
                                    {weekdayDateText(d.index)}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>

                          <div className="mt-3 rounded-xl border-2 border-[#F29420] bg-slate-50 p-5">
                            <div className="text-lg font-semibold text-slate-900">
                              {WEEKDAYS[dayIndex].label}
                            </div>
                            <div className="mt-2 text-lg leading-relaxed text-slate-900">
                              {current.questions?.[dayIndex] ?? '—'}
                            </div>
                          </div>

                          <div className="h-6" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {orderedBottomSections.map((section) => {
                    if (section === 'notes' && current?.id) {
                      return (
                        <div key="notes" ref={notesBlockRef} className="mt-5">
                          <EmbeddedNotesHistoryCard
                            themeId={current.id}
                            onClose={() => {
                              pendingNotesScrollRef.current = false;
                              setShowNotes(false);
                              setBottomSectionOrder((prev) =>
                                prev.filter((entry) => entry !== 'notes')
                              );
                            }}
                          />
                        </div>
                      );
                    }

                    if (section === 'ical') {
                      return (
                        <div
                          key="ical"
                          ref={icalBlockRef}
                          className="mt-5 rounded-2xl border border-[#F29420] bg-white p-5 shadow-sm"
                        >
                          <div className="space-y-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-slate-900">
                                  iCal-Schnellbearbeitung
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                  Hier bearbeitest du die aktuell sichtbare Woche direkt unterhalb
                                  der Quotes-Seite. Erst nach Klick auf „Änderungen lokal speichern“
                                  bleiben die Anpassungen lokal auf diesem Gerät erhalten.
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={handleInlineIcalSave}
                                  className={[
                                    'inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition duration-200',
                                    inlineIcalSaved
                                      ? 'cursor-pointer border border-[#4EA72E] bg-[#4EA72E] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-xl'
                                      : 'cursor-pointer bg-[#F29420] text-white hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl',
                                  ].join(' ')}
                                >
                                  {inlineIcalSaved
                                    ? 'Änderungen lokal gespeichert'
                                    : 'Änderungen lokal speichern'}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleDirectIcalDownload}
                                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-[#4EA72E] bg-[#4EA72E] px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-[#3f8a25] hover:bg-[#3f8a25] hover:shadow-xl"
                                >
                                  bearbeiteten iCal herunterladen
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    pendingIcalScrollRef.current = false;
                                    setShowInlineIcal(false);
                                    setBottomSectionOrder((prev) =>
                                      prev.filter((entry) => entry !== 'ical')
                                    );
                                  }}
                                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[#F29420] px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                                >
                                  schließen
                                </button>
                              </div>
                            </div>

                            <div className="rounded-2xl border-2 border-[#F29420] bg-slate-50 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-lg font-semibold text-slate-900">
                                    {currentTitle || '—'}
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-slate-600">
                                    {dateRangeText || '—'}
                                  </div>
                                </div>

                                <div className="rounded-xl border border-[#F29420] bg-white px-3 py-2 text-sm text-slate-700">
                                  Aktuelle Woche
                                </div>
                              </div>

                              <div className="mt-3 rounded-xl border border-[#F29420] bg-white p-4">
                                <div className="text-sm font-semibold text-slate-900">Wochenzitat</div>
                                <div className="mt-2 text-sm leading-relaxed text-slate-700">
                                  „{current?.quote ?? '—'}“
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {inlineIcalRows.map((row) => (
                                  <div
                                    key={row.key}
                                    className="rounded-2xl border border-slate-200 bg-white p-4"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="text-sm font-semibold text-slate-900">
                                        {row.label}
                                      </div>
                                      <div className="text-xs text-slate-500">{row.dateText}</div>
                                    </div>

                                    <textarea
                                      value={row.text}
                                      onChange={(event) =>
                                        handleInlineRowChange(row.key, event.target.value)
                                      }
                                      rows={4}
                                      className="mt-3 min-h-[112px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-[#F29420] focus:ring-2 focus:ring-[#F29420]/20"
                                    />

                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                      <div className="text-xs text-slate-500">
                                        Standard: {row.defaultText}
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleInlineRowChange(row.key, row.defaultText)
                                        }
                                        disabled={row.text === row.defaultText}
                                        className={[
                                          'inline-flex min-h-[36px] items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-sm transition duration-200',
                                          row.text !== row.defaultText
                                            ? 'cursor-pointer border-slate-300 bg-white text-slate-700 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 hover:shadow-md'
                                            : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                                        ].join(' ')}
                                      >
                                        Standard
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="text-sm text-slate-600">
                              Die Schnellbearbeitung gilt nur für die aktuell sichtbare Woche.
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return null
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </BackgroundLayout>
    </AuthWrapper>
  );
}