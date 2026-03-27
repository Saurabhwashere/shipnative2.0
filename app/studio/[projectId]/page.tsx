'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
  loading: () => <div className="h-screen bg-[#1c1c1c]" />,
});

const MobileFallback = () => (
  <div className="flex lg:hidden h-screen items-center justify-center bg-[#1c1c1c] px-6">
    <div className="text-center max-w-xs">
      <p className="text-[#f0f0f5] font-semibold text-sm mb-2">Desktop required</p>
      <p className="text-[#6b7080] text-sm leading-relaxed">
        ShipNative requires a desktop browser (1024px+) for the full IDE experience.
      </p>
    </div>
  </div>
);

function StudioContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') ?? undefined;

  return (
    <>
      <div className="hidden lg:block">
        <AppShell projectId={projectId} initialPrompt={initialPrompt} />
      </div>
      <MobileFallback />
    </>
  );
}

export default function StudioProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <Suspense fallback={<div className="h-screen bg-[#1c1c1c]" />}>
      <StudioContent projectId={projectId} />
    </Suspense>
  );
}
