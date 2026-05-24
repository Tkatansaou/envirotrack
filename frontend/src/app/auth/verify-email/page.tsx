'use client';

import { useState, useRef, Suspense } from 'react';
import type React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, Mail, Terminal } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const IS_DEV = process.env.NODE_ENV === 'development';

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const { toast } = useToast();
  const emailFromQuery = params.get('email') ?? '';
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [devFetching, setDevFetching] = useState(false);
  const [email, setEmail] = useState(emailFromQuery);
  const codeRef = useRef<HTMLInputElement>(null);

  async function handleResend() {
    if (!email) {
      toast('Saisissez votre adresse email ci-dessus.', 'error');
      return;
    }
    setResending(true);
    try {
      await api('/api/auth/resend-verification', { method: 'POST', body: { email } });
      toast('Code renvoyé ! Vérifiez votre boîte mail (et les spams).', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impossible de renvoyer le code.';
      toast(msg, 'error');
    } finally {
      setResending(false);
    }
  }

  async function handleDevFetch() {
    if (!email) {
      toast('Saisissez votre adresse email ci-dessus.', 'error');
      return;
    }
    setDevFetching(true);
    try {
      const res = await fetch(`/api/dev/code?email=${encodeURIComponent(email)}`);
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok || !data.code) {
        const errCode = data.error ?? '';
        if (errCode === 'NO_PENDING_CODE') {
          toast(
            'Aucun code en attente — compte déjà vérifié ? Connectez-vous sur /auth/login',
            'error',
          );
        } else if (errCode === 'USER_NOT_FOUND') {
          toast("Email inconnu en base. Vérifiez l'adresse ou inscrivez-vous.", 'error');
        } else {
          toast(errCode || 'Code introuvable en base.', 'error');
        }
        return;
      }
      if (codeRef.current) {
        codeRef.current.value = data.code;
        codeRef.current.focus();
      }
      toast(`Code récupéré : ${data.code}`, 'success');
    } catch {
      toast('Impossible de récupérer le code.', 'error');
    } finally {
      setDevFetching(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api('/api/auth/verify-email', {
        method: 'POST',
        body: { email: fd.get('email'), code: fd.get('code') },
      });
      await refresh();
      toast('Email vérifié ! Bienvenue sur EnviroTrack.', 'success');
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Code invalide ou expiré.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#123C24] flex items-center justify-center">
              <Leaf size={15} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[#123C24] group-hover:text-green-800 transition-colors">
              EnviroTrack
            </span>
          </Link>
          <div className="mt-5 mb-3 flex justify-center">
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
              <Mail size={24} className="text-[#123C24]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Vérifier votre email</h1>
          <p className="text-gray-500 text-sm mt-1">
            Saisissez le code à 8 caractères reçu par email.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
                Code de vérification
              </label>
              <input
                ref={codeRef}
                id="code"
                name="code"
                type="text"
                required
                maxLength={8}
                autoComplete="one-time-code"
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors uppercase"
                placeholder="XXXXXXXX"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#123C24] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#0f2d1c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {loading ? 'Vérification…' : 'Vérifier mon email'}
            </button>
          </form>
        </div>

        <div className="mt-4 space-y-2 text-center">
          <p className="text-sm text-gray-500">
            Vous n&apos;avez pas reçu de code ?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-[#123C24] font-medium hover:underline disabled:opacity-50"
            >
              {resending ? 'Envoi…' : 'Renvoyer'}
            </button>
          </p>

          {IS_DEV && (
            <div className="mt-3 border border-amber-200 bg-amber-50 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1.5 mb-2">
                <Terminal size={12} />
                Mode développement
              </p>
              <button
                type="button"
                onClick={handleDevFetch}
                disabled={devFetching}
                className="w-full text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {devFetching ? 'Récupération…' : 'Récupérer le code depuis la base de données'}
              </button>
              <p className="text-[10px] text-amber-600 mt-1.5">
                Ce bouton n&apos;apparaît pas en production.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
