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
  title: { default: 'EnviroTrack', template: '%s | EnviroTrack' },
  description:
    "Plateforme de gestion des EIES et PGES pour les bureaux d'études environnementaux au Togo. Réalisez vos études d'impact 3× plus vite.",
  keywords: ['EIES', 'PGES', 'environnement', 'Togo', "bureau d'études", 'ANGE'],
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
