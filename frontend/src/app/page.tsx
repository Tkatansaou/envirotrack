'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Leaf, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const TRUST_BADGES = ['Conforme Décret 2017-040/PR', 'Normes ANGE Togo', 'Tmoney & Flooz acceptés'];

const FEATURES = [
  { icon: '📋', label: 'Checklist réglementaire' },
  { icon: '📝', label: 'Rédaction EIES guidée' },
  { icon: '📊', label: 'Suivi PGES trimestriel' },
  { icon: '📄', label: 'Export PDF aux normes' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Leaf size={16} className="text-[#123C24] animate-pulse" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 h-14 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#123C24] flex items-center justify-center">
            <Leaf size={13} className="text-white" />
          </div>
          <span className="font-bold text-[#123C24] text-base">EnviroTrack</span>
        </div>
        <Link
          href="/auth/login"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Connexion
        </Link>
      </nav>

      {/* Hero — full remaining height */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-green-50 text-[#123C24] px-3 py-1 rounded-full text-xs font-semibold mb-8 border border-green-100">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Plateforme EIES · Togo
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5 max-w-2xl">
          Vos études d&apos;impact, <span className="text-[#123C24]">sans la complexité</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-gray-500 max-w-lg mb-10 leading-relaxed">
          Checklist réglementaire, rédaction EIES guidée et suivi PGES en un seul outil. Conforme
          aux normes ANGE et bailleurs internationaux.
        </p>

        {/* Primary CTA */}
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2.5 bg-[#123C24] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#0f2d1c] active:scale-95 transition-all shadow-lg shadow-green-900/20"
        >
          Commencer gratuitement
          <ArrowRight size={18} />
        </Link>

        {/* Micro-copy */}
        <p className="mt-4 text-xs text-gray-400">
          Déjà inscrit ?{' '}
          <Link href="/auth/login" className="underline underline-offset-2 hover:text-gray-700">
            Connexion
          </Link>
        </p>

        {/* Feature pills */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 px-3 py-4 border border-gray-100"
            >
              <span className="text-2xl">{f.icon}</span>
              <span className="text-xs font-medium text-gray-600 text-center leading-tight">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Trust */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {TRUST_BADGES.map((b) => (
            <span key={b} className="flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle2 size={12} className="text-green-500 shrink-0" />
              {b}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-5 sm:px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <span>© 2026 EnviroTrack · Lomé, Togo</span>
        <div className="flex items-center gap-5">
          <Link href="/legal/cgu" className="hover:text-gray-600 transition-colors">
            CGU
          </Link>
          <Link href="/auth/login" className="hover:text-gray-600 transition-colors">
            Connexion
          </Link>
          <Link href="/auth/signup" className="hover:text-gray-600 transition-colors">
            Inscription
          </Link>
        </div>
      </footer>
    </div>
  );
}
