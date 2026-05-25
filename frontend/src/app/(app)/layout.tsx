'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderPlus,
  Building2,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  Leaf,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useApi } from '@/lib/useApi';
import FeedbackWidget from '@/components/FeedbackWidget';

interface SubCheck {
  subscription: { id: string; status: string } | null;
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { href: '/projects/new', icon: FolderPlus, label: 'Nouveau projet' },
  { href: '/settings/bureau', icon: Building2, label: 'Mon bureau' },
  { href: '/settings/team', icon: Users, label: 'Équipe' },
  { href: '/settings/billing', icon: CreditCard, label: 'Facturation' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    data: subData,
    loading: subLoading,
    error: subError,
  } = useApi<SubCheck>('/api/subscriptions/me', { skip: !user });

  const isBillingPath = pathname.startsWith('/settings/billing');

  const hasActiveSub =
    subData !== null &&
    !!subData?.subscription &&
    ['ACTIVE', 'PAST_DUE'].includes(subData.subscription.status);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (subLoading || subError) return;
    if (!hasActiveSub && !isBillingPath) {
      router.replace('/settings/billing?plans=1');
    }
  }, [loading, user, subLoading, subError, hasActiveSub, isBillingPath, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user || (subLoading && !isBillingPath)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-400">
          <Leaf size={16} className="text-[#123C24] animate-pulse" />
          <span className="text-sm">Chargement…</span>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  const userInitial = user.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:translate-x-0 md:static md:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#123C24] flex items-center justify-center shrink-0">
              <Leaf size={14} className="text-white" />
            </div>
            <span className="font-bold text-base text-[#123C24] group-hover:text-green-700 transition-colors">
              EnviroTrack
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#123C24]/10 text-[#123C24]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#123C24]' : 'text-gray-400'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#123C24]/10 flex items-center justify-center text-[#123C24] font-bold text-sm shrink-0 border border-[#123C24]/10">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{user.email}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Compte actif</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-xs text-gray-400 hover:text-red-600 transition-colors py-1 rounded-lg hover:bg-red-50 px-2"
          >
            <LogOut size={13} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#123C24] flex items-center justify-center">
                <Leaf size={10} className="text-white" />
              </div>
              <span className="font-semibold text-[#123C24] text-sm">EnviroTrack</span>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#123C24]/10 flex items-center justify-center text-[#123C24] font-bold text-xs">
            {userInitial}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <FeedbackWidget />
    </div>
  );
}
