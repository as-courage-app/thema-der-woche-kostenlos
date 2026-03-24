'use client';

import { useEffect, useMemo, useState } from 'react';

type InfoButtonProps = {
  className?: string;
};

type InfoItem = {
  title: string;
  body: string;
};

const RAW_INFO_ITEMS: InfoItem[] = [
  {
    title: 'Änderung der Reihenfolge',
    body: 'Hier verschiebst du ausgewählte Themen nach oben oder unten. So legst du fest, in welcher Reihenfolge deine Themen später erscheinen.',
  },
  {
    title: 'Anwendungsbeispiele',
    body: 'Hier findest du kurze Ideen, wie du „Thema der Woche“ im Alltag, in Gruppen, in Teams oder in Seminaren einsetzen kannst.',
  },
  {
    title: 'Anzahl Wochen',
    body: 'Hier legst du fest, für wie viele Wochen Themen vorbereitet werden sollen. Die Anzahl bestimmt auch, wie viele Themen du auswählst.',
  },
  {
    title: 'Auswahl löschen',
    body: 'Damit entfernst du deine bisherige Themenauswahl. Danach kannst du neu starten und deine Auswahl neu aufbauen.',
  },
  {
    title: 'Details',
    body: 'Hier öffnest du vertiefende Inhalte zum ausgewählten Thema. Dazu gehören zum Beispiel Infografik, Kurzversion und Langversion.',
  },
  {
    title: 'iCal',
    body: 'Diese Funktion gehört zur Kalendernutzung. Damit können Inhalte als Kalenderdaten vorbereitet oder übernommen werden.',
  },
  {
    title: 'iCal downloaden',
    body: 'Hier lädst du eine Kalenderdatei herunter. Diese kannst du anschließend in einen passenden Kalender importieren.',
  },
  {
    title: 'Infografik',
    body: 'Hier öffnest du eine grafische Übersicht zum aktuellen Thema. Die Infografik zeigt die Inhalte knapp und visuell verständlich.',
  },
  {
    title: 'Kurzversion',
    body: 'Hier findest du eine kurze und kompakte Zusammenfassung zum Thema. Gut geeignet für einen schnellen Überblick.',
  },
  {
    title: 'Langversion',
    body: 'Hier findest du ausführlichere Informationen und mehr Vertiefung zum Thema. Gut geeignet, wenn du genauer einsteigen möchtest.',
  },
  {
    title: 'manuell',
    body: 'Hier wählst du deine Themen selbst und gezielt aus. Du entscheidest also bewusst, welche Themen in deine Auswahl kommen.',
  },
  {
    title: 'Mediathek',
    body: 'Hier findest du ergänzende Medieninhalte wie Podcast und Videos. So kannst du Themen auch hörend oder visuell vertiefen.',
  },
  {
    title: 'Notizen',
    body: 'Hier kannst du eigene Gedanken, Beobachtungen oder Ideen zum Thema festhalten. So wird aus einem Impuls schneller ein eigener Arbeitsstand.',
  },
  {
    title: 'Podcast',
    body: 'Hier kannst du dir den Audioinhalt zum aktuellen Thema anhören. Das ist praktisch für unterwegs oder als ruhiger Zusatzimpuls.',
  },
  {
    title: 'Start',
    body: 'Hier beginnt dein Einstieg in die Anwendung oder in einen neuen Ablauf. Von dort aus gehst du in die nächsten Schritte weiter.',
  },
  {
    title: 'Themenauswahl',
    body: 'Hier wählst du die Themen aus, mit denen du arbeiten möchtest. Deine Auswahl bildet die Grundlage für die nächsten Wochen.',
  },
  {
    title: 'Videos',
    body: 'Hier findest du ergänzende Videoinhalte. Sie können helfen, ein Thema anschaulicher und lebendiger zu verstehen.',
  },
  {
    title: 'Weiter',
    body: 'Mit diesem Button gehst du zum nächsten Schritt. Er führt dich innerhalb des gewählten Ablaufs weiter.',
  },
  {
    title: 'zum Upgrade',
    body: 'Hier findest du den Weg zu erweiterten Funktionen der Vollversion. So kannst du bei Bedarf zusätzliche Inhalte freischalten.',
  },
  {
    title: 'Zufall',
    body: 'Hier werden Themen automatisch für dich ausgewählt. Das ist hilfreich, wenn du offen starten oder dich überraschen lassen möchtest.',
  },
];

export default function InfoButton({ className = '' }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  const infoItems = useMemo(() => {
    return [...RAW_INFO_ITEMS].sort((a, b) =>
      a.title.localeCompare(b.title, 'de', { sensitivity: 'base' })
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const buttonClasses = [
    'fixed z-[70] flex h-11 w-11 items-center justify-center rounded-xl text-2xl leading-none shadow-md transition focus:outline-none focus-visible:ring-2',
    className ||
      'cursor-pointer bg-white/90 text-slate-900 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:ring-slate-400 focus-visible:ring-slate-900',
  ].join(' ');

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={buttonClasses}
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
          right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
        }}
        aria-label="Info öffnen"
        title="Info"
      >
        ℹ️
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-dialog-title"
        >
          <div
            className="absolute inset-0 bg-black/35"
            onMouseDown={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
              <div>
                <h2 id="info-dialog-title" className="text-xl font-semibold text-slate-900">
                  Info
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Hier findest du kurze Erklärungen zu den wichtigsten Funktionen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-lg px-2 py-1 text-slate-700 transition hover:bg-slate-100"
                aria-label="Schließen"
                title="Schließen"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-5">
              <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <p className="font-semibold text-slate-900">Kurzer Hinweis</p>
                <p className="mt-2">
                  Tippe oder klicke auf einen Begriff, um die passende Erklärung zu öffnen.
                  Die Liste ist alphabetisch sortiert.
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {infoItems.map((item) => (
                  <details
                    key={item.title}
                    className="rounded-xl border border-slate-200 bg-white"
                  >
                    <summary className="cursor-pointer rounded-xl px-4 py-3 font-semibold text-slate-900">
                      {item.title}
                    </summary>
                    <div className="px-4 pb-4 text-sm leading-6 text-slate-700">
                      {item.body}
                    </div>
                  </details>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer rounded-xl bg-[#F29420] px-4 py-2 text-2xl leading-none text-white transition hover:bg-[#E4891E] hover:shadow-lg"
                  aria-label="Info schließen"
                  title="Schließen"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}