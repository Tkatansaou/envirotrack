'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: fd.get('email') },
      });
      setSent(true);
    } catch {
      // Réponse identique qu'il y ait un compte ou non (anti-énumération)
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé</h1>
          <p className="text-gray-500 text-sm mb-6">
            Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation dans
            quelques minutes.
          </p>
          <Link href="/auth/login" className="text-green-700 font-medium text-sm hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold text-green-700">
            EnviroTrack
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Mot de passe oublié</h1>
          <p className="text-gray-500 text-sm mt-1">
            Saisissez votre email pour recevoir un code de réinitialisation.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="vous@bureau.tg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-green-700 font-medium hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
