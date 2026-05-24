'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { Leaf, Eye, EyeOff, Building2, UserCheck, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

type AccountType = 'BUREAU' | 'EXPERT' | 'TERRAIN';

const ACCOUNT_TYPES: { value: AccountType; label: string; sub: string; icon: typeof Building2 }[] =
  [
    {
      value: 'BUREAU',
      label: "Bureau d'études",
      sub: 'Projets EIES/PGES multi-membres',
      icon: Building2,
    },
    {
      value: 'EXPERT',
      label: 'Expert indépendant',
      sub: 'Consultant freelance, annuaire public',
      icon: UserCheck,
    },
    {
      value: 'TERRAIN',
      label: 'Agent de terrain',
      sub: 'Saisie journalière & rapports de suivi',
      icon: MapPin,
    },
  ];

export default function SignupPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>('BUREAU');

  useEffect(() => {
    fetch('/api/auth/signup-token')
      .then((r) => r.json())
      .then((d: { token: string | null }) => setSignupToken(d.token))
      .catch(() => {});
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const emailVal = String(fd.get('email'));
    try {
      await api('/api/auth/signup', {
        method: 'POST',
        body: {
          email: emailVal,
          password: fd.get('password'),
          name: fd.get('name'),
          accountType,
        },
        ...(signupToken ? { headers: { 'x-signup-token': signupToken } } : {}),
      });
      setEmail(emailVal);
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-[#123C24]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifiez vos emails</h1>
          <p className="text-gray-500 text-sm mb-6">
            Un code de vérification a été envoyé à{' '}
            <span className="font-medium text-gray-700">{email}</span>. Saisissez-le pour activer
            votre compte.
          </p>
          <Link
            href={`/auth/verify-email?email=${encodeURIComponent(email)}`}
            className="inline-block bg-[#123C24] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#0f2d1c] transition-colors"
          >
            Saisir le code →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#123C24] flex items-center justify-center">
              <Leaf size={15} className="text-white" />
            </div>
            <span className="text-xl font-bold text-[#123C24] group-hover:text-green-800 transition-colors">
              EnviroTrack
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-5">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">Choisissez votre profil pour commencer</p>
        </div>

        {/* Sélecteur de type de compte */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ACCOUNT_TYPES.map(({ value, label, sub, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAccountType(value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                accountType === value
                  ? 'border-[#123C24] bg-[#123C24]/5 text-[#123C24]'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <Icon
                size={20}
                className={accountType === value ? 'text-[#123C24]' : 'text-gray-400'}
              />
              <span className="text-xs font-semibold leading-tight">{label}</span>
              <span className="text-[10px] leading-tight text-gray-400 hidden sm:block">{sub}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom complet
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
                placeholder={
                  accountType === 'BUREAU'
                    ? 'Cabinet Environnement & Développement'
                    : accountType === 'EXPERT'
                      ? 'Dr. Kofi Mensah'
                      : 'Amadou Traoré'
                }
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
                placeholder={
                  accountType === 'BUREAU'
                    ? 'contact@bureau-etudes.tg'
                    : accountType === 'EXPERT'
                      ? 'expert@consulting.tg'
                      : 'agent@terrain.tg'
                }
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#123C24]/30 focus:border-[#123C24] transition-colors"
                  placeholder="Minimum 10 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPw ? 'Masquer' : 'Afficher'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#123C24] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#0f2d1c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="/legal/cgu" className="underline underline-offset-2 hover:text-gray-600">
              conditions d&apos;utilisation
            </Link>
            .
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-[#123C24] font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
