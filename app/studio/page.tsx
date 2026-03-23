'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// Skip SSR entirely for the editor shell — it's a pure client-side interactive app
// (uses Service Workers, Babel CDN, browser APIs) so server rendering buys nothing
// and causes hydration mismatches from timestamps and browser-only globals.
const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => <div className="h-screen bg-[#1c1c1c]" />,
});

// The mobile fallback is pure markup — safe to server-render.
const MobileFallback = () => (
  <div className="flex lg:hidden h-screen items-center justify-center bg-[#1c1c1c] px-6">
    <div className="text-center max-w-xs">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 0 24px rgba(255,255,255,0.05)',
        }}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2
        className="font-bold text-xl mb-2"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        ShipNative
      </h2>
      <p className="text-[#f0f0f5] font-semibold text-sm mb-2">Desktop required</p>
      <p className="text-[#6b7080] text-sm leading-relaxed">
        ShipNative requires a desktop browser (1024px+) for the full IDE experience.
      </p>
    </div>
  </div>
);

export default function Page() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') ?? undefined;

  return (
    <>
      {/* Desktop: client-only, no SSR */}
      <div className="hidden lg:block">
        <AppShell initialPrompt={initialPrompt} />
      </div>

      {/* Mobile: safe to SSR */}
      <MobileFallback />
    </>
  );
}
