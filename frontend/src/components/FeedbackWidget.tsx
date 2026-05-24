'use client';

import { useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const CATEGORIES = [
  { value: 'BUG', label: '🐛 Bug', desc: 'Quelque chose ne fonctionne pas' },
  { value: 'FEATURE', label: '✨ Fonctionnalité', desc: "Une idée d'amélioration" },
  { value: 'UX', label: '🎨 UX/Design', desc: 'Expérience utilisateur' },
  { value: 'PERFORMANCE', label: '⚡ Performance', desc: 'Lenteur ou blocage' },
  { value: 'OTHER', label: '💬 Autre', desc: 'Tout autre retour' },
];

export default function FeedbackWidget() {
  const { toast } = useToast();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'category' | 'form' | 'done'>('category');
  const [category, setCategory] = useState('OTHER');
  const [rating, setRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep('category');
    setCategory('OTHER');
    setRating(null);
    setTitle('');
    setBody('');
  }

  function handleClose() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: {
          category,
          title: title.trim(),
          body: body.trim(),
          page: pathname,
          ...(rating ? { rating } : {}),
        },
      });
      setStep('done');
      toast('Merci pour votre retour !', 'success');
    } catch {
      toast("Erreur lors de l'envoi. Réessayez.", 'error');
    } finally {
      setSaving(false);
    }
  }

  // Don't show on admin pages
  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Donner un avis"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#123C24] text-white shadow-lg hover:bg-green-800 transition-all hover:scale-105"
      >
        <span className="text-xl">💬</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />

          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Votre avis compte</h3>
                <p className="text-xs text-gray-400 mt-0.5">Aidez-nous à améliorer EnviroTrack</p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Step: category */}
            {step === 'category' && (
              <div className="p-5 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Quel type de retour ?
                </p>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value);
                      setStep('form');
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-green-300 hover:bg-green-50 transition-all"
                  >
                    <span className="text-lg">{cat.label.split(' ')[0]}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {cat.label.split(' ').slice(1).join(' ')}
                      </p>
                      <p className="text-xs text-gray-400">{cat.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step: form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    Note globale (optionnel)
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(rating === n ? null : n)}
                        className={`text-2xl transition-transform hover:scale-110 ${
                          rating && n <= rating ? 'text-yellow-400' : 'text-gray-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Titre <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Résumez en quelques mots…"
                    maxLength={120}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Détails <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Décrivez votre retour avec le plus de détails possible…"
                    rows={4}
                    minLength={10}
                    maxLength={2000}
                    required
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{body.length}/2000</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('category')}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    ← Retour
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !title.trim() || !body.trim()}
                    className="flex-1 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Envoi…' : 'Envoyer mon avis'}
                  </button>
                </div>
              </form>
            )}

            {/* Step: done */}
            {step === 'done' && (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-4xl">
                  🎉
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Merci !</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Votre retour a été transmis à notre équipe. Nous l&apos;analyserons avec
                  attention.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-5 rounded-xl bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
