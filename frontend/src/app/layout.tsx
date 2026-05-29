import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/contexts/ToastContext';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'EnviroTrack — EIES & PGES au Togo', template: '%s | EnviroTrack' },
  description:
    "Plateforme SaaS de conformité environnementale pour le Togo. Gérez vos EIES, suivez vos PGES, soumettez vos rapports à l'ANGE — 3× plus vite.",
  keywords: [
    'EIES',
    'PGES',
    'étude impact environnemental',
    'conformité environnementale',
    'Togo',
    "bureau d'études",
    'ANGE',
    'évaluation environnementale',
    'suivi environnemental',
    'rapport environnemental',
  ],
  metadataBase: new URL('https://envirotrack.uk'),
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://envirotrack.uk',
    siteName: 'EnviroTrack',
    title: 'EnviroTrack — Conformité environnementale EIES & PGES au Togo',
    description:
      "Plateforme SaaS de conformité environnementale pour le Togo. Gérez vos EIES, suivez vos PGES, soumettez vos rapports à l'ANGE.",
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EnviroTrack — EIES & PGES au Togo',
    description:
      "Plateforme SaaS de conformité environnementale pour le Togo. Gérez vos EIES, suivez vos PGES, soumettez vos rapports à l'ANGE.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
