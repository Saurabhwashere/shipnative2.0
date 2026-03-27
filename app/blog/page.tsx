'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const POSTS = [
  {
    slug: 'introducing-shipnative',
    title: 'Introducing ShipNative',
    date: 'March 2026',
    description: 'Build production-ready React Native apps with AI — no setup, no config, just describe what you want.',
    tag: 'Product',
  },
  {
    slug: 'ai-native-development',
    title: 'What AI-native development looks like',
    date: 'March 2026',
    description: 'A look at how the development workflow changes when the AI writes the code and you steer the product.',
    tag: 'Engineering',
  },
];

export default function BlogPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)' }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/5">
        <Link
          href="/"
          className="text-xl text-white italic hover:opacity-75 transition-opacity"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
        >
          Shipnative
        </Link>
        <Link
          href="/"
          className="text-sm text-white/60 hover:text-white transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          ← Back
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1
            className="text-4xl text-white mb-3"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Blog
          </h1>
          <p className="text-white/50 text-sm mb-14" style={{ fontFamily: 'var(--font-body)' }}>
            Updates, ideas, and behind-the-scenes from the ShipNative team.
          </p>

          <div className="flex flex-col gap-6">
            {POSTS.map((post, i) => (
              <motion.article
                key={post.slug}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                className="group rounded-2xl p-6 transition-colors cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}
                  >
                    {post.tag}
                  </span>
                  <span className="text-white/30 text-xs" style={{ fontFamily: 'var(--font-body)' }}>
                    {post.date}
                  </span>
                </div>
                <h2
                  className="text-lg text-white mb-2 group-hover:text-white/80 transition-colors"
                  style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
                >
                  {post.title}
                </h2>
                <p className="text-sm text-white/50 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                  {post.description}
                </p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
