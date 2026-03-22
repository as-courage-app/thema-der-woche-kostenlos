'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import BackgroundLayout from '../../components/BackgroundLayout';

const APP_MODE_KEY = 'as-courage.appMode.v1';

type AppMode = 'free' | 'full' | null;

function readMode(): AppMode {
  try {
    const v = localStorage.getItem(APP_MODE_KEY);
    if (v === 'free' || v === 'full') return v;
    return null;
  } catch {
    return null;
  }
}

export default function StartPage() {
  const [mode, setMode] = useState<AppMode>(null);
  const [ready, setReady] = useState(false);

  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    setMode(readMode());
    setReady(true);
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const email = data?.session?.user?.email ?? null;
      setHasSession(Boolean(data?.session));
      setSessionEmail(email);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setHasSession(Boolean(session));
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  if (!ready) return null;

  const title =
    mode === 'free' ? 'Kostenlose Version' : mode === 'full' ? 'Vollversion' : 'Bitte Version wählen';

  // In der kostenlosen Version ist Login deaktiviert.
  // In der Vollversion sollen Themen/Setup nur nach Anmeldung nutzbar sein.
  const canUseThemesSetup = mode === 'free' ? true : hasSession;

  const loginHint =
    mode === 'free'
      ? 'In der kostenlosen Version ist die Anmeldung deaktiviert.'
      : hasSession
        ? `Du bist angemeldet${sessionEmail ? ` als ${sessionEmail}` : ''}.`
        : 'Bitte melde dich an, um „Themen“ und „Setup“ zu nutzen.';

  const loginTag = mode === 'free' ? 'deaktiviert' : hasSession ? 'angemeldet' : 'nicht angemeldet';

  const topBtnBase =
    'rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900';

  const topBtnEnabled =
    `${topBtnBase} cursor-pointer hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400`;

  const topBtnDisabled = `${topBtnBase} opacity-50 cursor-not-allowed`;

  return (
    <BackgroundLayout>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <section className="rounded-2xl bg-white/85 p-6 shadow-xl backdrop-blur-md">
          {/* Kopfzeile: Titel links, Schalt-Buttons rechts */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Thema der Woche <span className="text-slate-600">(Edition 1)</span>
              </h1>

              <div className="mt-2 text-sm text-slate-700">
                <span className="font-semibold">{title}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/version"
                className="cursor-pointer rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-slate-900 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                zurück
              </Link>

              {canUseThemesSetup ? (
                <>
                  <Link href="/themes" className={topBtnEnabled} title="Zur Themenübersicht">
                    Themenauswahl
                  </Link>
                  <Link
                    href="https://thema-der-woche.vercel.app/account"
                    className="rounded-xl bg-[#F29420] px-4 py-2 text-sm text-slate-900 shadow-md transition hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-[#E4891E] hover:shadow-xl"
                    title="Zum Update"
                  >
                    zum upgrade
                  </Link>
                </>
              ) : (
                <>
                  <span className={topBtnDisabled} aria-disabled="true" title="Bitte erst anmelden">
                    Themenauswahl
                  </span>
                  <span className={topBtnDisabled} aria-disabled="true" title="Bitte erst anmelden">
                    zum upgrade
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Einleitung kostenlose Version */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="text-base font-semibold text-slate-900">Willkommen bei Thema der Woche</div>

                <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900">
                  ohne Anmeldung
                </span>
              </div>

              <div className="mt-1 text-sm text-slate-700">
                Diese App unterstützt Sie dabei, wichtige Themen im Alltag bewusst in den Blick zu nehmen –
                mit kurzen Impulsen, klaren Fragen und Anregungen für gute Gespräche, Reflexion und
                persönliche Entwicklung.
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                In der kostenlosen Version sind die <span className="font-semibold text-slate-900">ersten vier Themen</span> frei. Sie können sie direkt ausprobieren und die Grundstruktur der App kennenlernen.
                Über die <span className="font-semibold text-slate-900">Themenauswahl</span> stellen Sie die
                Themen zusammen. Sie können über <span className="font-semibold text-slate-900">Anzahl Wochen</span> gleichzeitig zwei Themen  <span className="font-semibold text-slate-900">manuell</span> oder
                per <span className="font-semibold text-slate-900">Zufall</span> auswählen. Die Reihenfolge der Themen kann über Pfeiltasten
                frei festgelegt werden.
              </p>

              <p>
                Der <span className="font-semibold text-slate-900">Info-Button</span>{' '} oben rechts unter
                dem Logo begleitet Sie dauerhaft sichtbar durch die App und erklärt bei Bedarf wichtige Funktionen auf einen Blick.
                Über den <span className="font-semibold text-slate-900">orangenen Upgrade-Button</span>{' '}
                gelangen Sie jederzeit bequem zur Anmeldung für die Vollversionen mit erweitertem Umfang.
              </p>

              <div className="text-sm text-slate-700">
                So können Sie in Ruhe testen, ob Thema der Woche zu Ihnen, Ihrem Team oder Ihrer Einrichtung
                passt.
                <span className="block h-3" aria-hidden="true" />
                <span className="block text-base font-semibold text-slate-900">
                  Ich wünsche Ihnen viel Erfolg dabei,
                </span>
                <span className="block">
                  Andreas Sedlag, Kompetenztrainer, Theaterpädagoge und systemischer Coach
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </BackgroundLayout>
  );
}