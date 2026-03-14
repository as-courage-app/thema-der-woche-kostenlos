import Link from 'next/link';

type DetailsViewerProps = {
  standardSrc: string;
  detailSrc: string;
  themeNumber: string;
  initialView: 'kurz' | 'lang';
  backHref: string;
};

export default function DetailsViewer({
  standardSrc,
  detailSrc,
  themeNumber,
  initialView,
  backHref,
}: DetailsViewerProps) {
  const src = initialView === 'lang' ? detailSrc : standardSrc;

  return (
    <section className="mt-0">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="flex min-h-[44px] items-center justify-start border-b border-slate-700 bg-slate-900 px-3 py-2">
          <Link
            href={backHref}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-700 hover:border-slate-500 cursor-pointer"
          >
            zurück
          </Link>
        </div>

        <iframe
          src={src}
          title={`Thema ${themeNumber}`}
          className="block h-[calc(100vh-7rem)] w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}