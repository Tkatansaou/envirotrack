import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description:
    'Créez votre compte EnviroTrack et commencez votre essai gratuit de 14 jours. Conformité EIES & PGES au Togo.',
  alternates: { canonical: '/auth/signup' },
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
