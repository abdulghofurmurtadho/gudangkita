import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Boxes,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  Menu,
  Package,
  X,
} from 'lucide-react';

export type AppTab = 'dashboard' | 'inventory' | 'benchmark' | 'about';

interface NavItem {
  id: AppTab;
  label: string;
  description: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Ringkasan stok & benchmark',
    Icon: LayoutDashboard,
  },
  {
    id: 'inventory',
    label: 'Daftar Barang',
    description: 'CRUD, cari & urutkan stok',
    Icon: Package,
  },
  {
    id: 'benchmark',
    label: 'Perbandingan Performa',
    description: 'Uji sorting & searching',
    Icon: BarChart3,
  },
  {
    id: 'about',
    label: 'Tentang & Metode',
    description: 'Kompleksitas & metodologi',
    Icon: BookOpen,
  },
];

interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  totalItemsCount: number;
  benchmarkCount: number;
  children: ReactNode;
}

export function AppShell({
  activeTab,
  onSelectTab,
  totalItemsCount,
  benchmarkCount,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleSelect = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const renderNavButtons = () => (
    <ul className="space-y-1.5">
      {NAV_ITEMS.map(({ id, label, description, Icon }) => {
        const isActive = activeTab === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => handleSelect(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                isActive
                  ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{label}</span>
                <span
                  className={`mt-0.5 block text-xs leading-snug ${
                    isActive ? 'text-blue-600/90' : 'text-slate-500'
                  }`}
                >
                  {description}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const renderSidebarFooter = () => (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200/80">
          <span className="block text-slate-500">SKU Gudang</span>
          <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
            {totalItemsCount}
          </span>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200/80">
          <span className="block text-slate-500">Rekam Uji</span>
          <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900 tabular-nums">
            {benchmarkCount}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <HardDrive className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
          <span>Penyimpanan Lokal</span>
        </div>
        <p className="mt-1 leading-relaxed">
          Seluruh data barang dan riwayat sesi tersimpan lokal di browser Anda (
          <code className="font-mono text-[11px] text-slate-700">localStorage</code>), tanpa server
          eksternal.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Lewati ke konten utama
      </a>

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight text-slate-900">GudangKita</p>
            <p className="truncate text-xs text-slate-500">Stok &amp; Analisis Algoritma</p>
          </div>
        </div>

        <div className="mt-4">
          <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Data Simulasi Akademik</span>
          </span>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Navigasi Utama">
          {renderNavButtons()}
        </nav>

        {renderSidebarFooter()}
      </aside>

      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">GudangKita</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  <GraduationCap className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Data Simulasi Akademik</span>
                  <span className="sm:hidden">Simulasi</span>
                </span>
              </div>
              <p className="truncate text-xs text-slate-500">
                Tersimpan lokal di browser • {totalItemsCount} SKU
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div
            id="mobile-nav-drawer"
            className="border-t border-slate-200 bg-white px-4 pb-5 pt-3 shadow-lg"
          >
            <nav aria-label="Navigasi Mobile">{renderNavButtons()}</nav>
            <div className="mt-4">{renderSidebarFooter()}</div>
          </div>
        ) : null}
      </header>

      {/* Main Content */}
      <main id="main-content" className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
