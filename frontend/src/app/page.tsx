'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Leaf, ArrowRight, CheckCircle2, Send } from 'lucide-react';
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

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

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

  async function handleContact(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? "Erreur lors de l'envoi.");
      }
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
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

      {/* Hero */}
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

      {/* Contact section */}
      <section className="px-5 sm:px-8 py-14 border-t border-gray-100 bg-gray-50">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">Nous contacter</h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Une question ? Écrivez-nous, nous répondons sous 24 h.
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-800">Message envoyé avec succès !</p>
              <p className="text-xs text-gray-400">
                Nous vous répondrons à {form.email || 'votre adresse'}.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-2 text-xs text-[#123C24] underline underline-offset-2"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleContact} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700">Nom complet *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jean Dupont"
                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-700">Adresse email *</label>
                  <input
                    type="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="jean@exemple.com"
                    className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Sujet</label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="Demande d'information sur EnviroTrack"
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Message *</label>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Décrivez votre question ou demande…"
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] bg-white resize-none"
                />
              </div>

              {sendError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {sendError}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center justify-center gap-2 bg-[#123C24] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#0f2d1c] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi…
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Envoyer le message
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

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
