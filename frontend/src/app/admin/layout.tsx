'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  ClipboardList,
  Tag,
  Leaf,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface AdminMe {
  admin: { id: string; email: string; role: 'ADMIN' | 'SUPERADMIN' };
}

const NAV = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users, exact: false },
  { href: '/admin/orders', label: 'Commandes', icon: CreditCard, exact: false },
  { href: '/admin/feedback', label: 'Feedbacks', icon: MessageSquare, exact: false },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag, exact: false },
  { href: '/admin/audit', label: 'Journal audit', icon: ClipboardList, exact: false },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminMe['admin'] | null>(null);
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await api<AdminMe>('/api/admin/me');
        if (!cancelled) setAdmin(res.admin);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            router.replace('/dashboard');
          } else {
            router.replace('/dashboard');
          }
        }
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!checked || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-[#123C24]" />
          <p className="text-sm text-gray-500">Vérification des droits…</p>
        </div>
      </div>
    );
  }

  const userInitial = admin.email[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-white/10 bg-[#0f2d1c] transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/20 border border-green-500/30">
            <Leaf size={15} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">EnviroTrack</p>
            <p className="text-[10px] text-green-400 font-medium tracking-wide uppercase">
              Administration
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href + '/') || pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-green-200/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} className={active ? 'text-green-400' : 'text-green-300/50'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-700/50 text-xs font-bold text-white border border-green-600/30">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-white">{admin.email}</p>
              <p className="text-[10px] text-green-400">
                {admin.role === 'SUPERADMIN' ? 'Super Admin' : 'Administrateur'}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-green-300/60 hover:text-green-300 transition-colors"
          >
            <ArrowLeft size={12} />
            Retour à l&apos;app
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="h-14 bg-[#0f2d1c] flex items-center justify-between px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-green-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Menu"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Leaf size={10} className="text-green-400" />
            </div>
            <span className="text-sm font-semibold text-white">Admin</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-green-700/50 flex items-center justify-center text-xs font-bold text-white border border-green-600/30">
            {userInitial}
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
