'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { SignInButton, UserButton, useAuth, useClerk } from '@clerk/nextjs';
import { PromptBox } from '@/components/ui/chatgpt-prompt-input';
import MuxPlayer from '@mux/mux-player-react';
import PricingModal from '@/components/PricingModal';

function Navbar({
  isSignedIn,
  onPricingClick,
}: {
  isSignedIn: boolean | null | undefined;
  onPricingClick: () => void;
}) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute top-6 left-1/2 z-20 -translate-x-1/2 w-full max-w-3xl px-4"
    >
      <div
        className="flex items-center justify-between rounded-full px-5 py-3"
        style={{
          background: 'rgba(255,255,255,0.13)',
          border: '1px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
        }}
      >
        {/* Logo */}
        <span
          className="text-xl text-white select-none italic"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
        >
          Shipnative
        </span>

        {/* Links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-6">
          <button
            onClick={onPricingClick}
            className="text-sm text-white/80 hover:text-white transition-colors font-medium bg-transparent border-none cursor-pointer"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Pricing
          </button>
          <a
            href="/blog"
            className="text-sm text-white/80 hover:text-white transition-colors font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Blog
          </a>
          <a
            href="#"
            className="text-sm text-white/80 hover:text-white transition-colors font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Contact
          </a>
        </div>

        {/* Auth */}
        {isSignedIn ? (
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8',
              },
            }}
          />
        ) : (
          <SignInButton mode="modal">
            <button
              className="rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'rgba(0,0,0,0.85)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Get started
            </button>
          </SignInButton>
        )}
      </div>
    </motion.nav>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const [pricingOpen, setPricingOpen] = useState(false);

  const handleSubmit = (prompt: string) => {
    if (!prompt.trim()) return;
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    router.push(`/studio?prompt=${encodeURIComponent(prompt.trim())}`);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* Background video */}
      <MuxPlayer
        playbackId={process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID!}
        autoPlay="muted"
        loop
        muted
        playsInline
        nohotkeys
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', pointerEvents: 'none',
          '--controls': 'none',
          '--media-object-fit': 'cover',
          '--media-object-position': 'center',
        }}
      />

      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 140px 60px rgba(0,0,0,0.7)' }}
      />

      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      {/* Navbar */}
      <Navbar isSignedIn={isSignedIn} onPricingClick={() => setPricingOpen(true)} />

      {/* Centered content */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">

          {/* Title — Instrument Serif */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="mb-5 font-normal leading-[1.1] tracking-tight text-white italic"
            style={{
              fontFamily: 'var(--font-heading)',
              textShadow: '0 2px 32px rgba(0,0,0,0.5)',
              fontSize: 'clamp(3.5rem, 8vw, 4.8rem)',
            }}
          >
            Shipnative
          </motion.h1>

          {/* Subtitle — Inter */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="mb-10 text-base font-normal leading-relaxed text-white/55 sm:text-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Build mobile apps with words
          </motion.p>

          {/* Prompt box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          >
            <PromptBox
              placeholder="e.g. A fitness app that tracks workouts and suggests meals"
              onSubmit={handleSubmit}
            />
          </motion.div>


        </div>
      </div>

      {/* Pricing modal */}
      <PricingModal open={pricingOpen} onClose={() => setPricingOpen(false)} />
    </main>
  );
}
