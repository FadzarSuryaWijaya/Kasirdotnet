'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth, logout } from '@/app/lib/auth';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  FileBarChart, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Store,
  User,
  ChevronsUpDown,
  Clock,
  Users,
  Boxes,
  Receipt,
  Wallet,
  ScrollText,
  Settings,
  Calendar,
  TrendingUp
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5136';

// Menu items tanpa submenu
const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Produk', href: '/admin/products', icon: Package },
  { name: 'Kategori', href: '/admin/categories', icon: Tags },
  { name: 'Inventori', href: '/admin/stock', icon: Boxes },
  { name: 'Kas', href: '/admin/cash-drawer', icon: Wallet },
  { name: 'Kasir', href: '/admin/users', icon: Users },
  { name: 'Transaksi', href: '/admin/transactions', icon: Receipt },
];

// Menu Laporan dengan submenu
const reportMenu = {
  name: 'Laporan',
  icon: FileBarChart,
  basePath: '/admin/reports',
  children: [
    { name: 'Ringkasan', href: '/admin/reports', icon: TrendingUp },
    { name: 'Harian', href: '/admin/reports/daily', icon: Calendar },
    { name: 'Shift', href: '/admin/reports/sessions', icon: Clock },
  ]
};

// Menu items setelah laporan
const bottomMenuItems = [
  { name: 'Audit Log', href: '/admin/audit', icon: ScrollText },
  { name: 'Pengaturan', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [storeName, setStoreName] = useState('Warung Kopi');
  const pathname = usePathname();
  const { user } = useAuth();
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-expand report menu if on report page
  useEffect(() => {
    if (pathname.startsWith('/admin/reports')) {
      setIsReportOpen(true);
    }
  }, [pathname]);

  // Load store name from settings
  useEffect(() => {
    const loadStoreName = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/store_name`);
        if (res.ok) {
          const data = await res.json();
          if (data.value) setStoreName(data.value);
        }
      } catch (err) {
        console.error('Failed to load store name');
      }
    };
    loadStoreName();
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/reports') {
      return pathname === '/admin/reports';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isReportActive = pathname.startsWith('/admin/reports');

  // Logic: Tutup dropdown kalau klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <aside 
      className={`relative min-h-screen bg-[#0f172a] text-white transition-all duration-300 border-r border-slate-700 flex flex-col ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* --- TOMBOL TOGGLE (Floating) --- */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 z-50 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-[#f8fafc] hover:bg-blue-700 transition-all"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />} 
      </button>

      {/* --- LOGO SECTION --- */}
      <div className={`flex items-center gap-3 p-6 ${isCollapsed ? "justify-center px-2" : ""}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
          <Store className="h-6 w-6 text-white" />
        </div>
        
        <div className={`overflow-hidden transition-all duration-300 ${
            isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        }`}>
          <h1 className="text-lg font-bold whitespace-nowrap">{storeName}</h1>
          <p className="text-xs text-slate-400 whitespace-nowrap">Admin Panel</p>
        </div>
      </div>

      {/* --- MENU ITEMS --- */}
      <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
        {/* Main menu items */}
        {menuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group relative ${
                active 
                  ? "bg-blue-600/10 text-blue-400" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <item.icon 
                size={20} 
                className={`shrink-0 transition-colors ${active ? "text-blue-400" : ""}`} 
              />
              <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-sm ${
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}>
                {item.name}
              </span>

              {isCollapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-md group-hover:block whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}

        {/* Report Menu with Submenu */}
        <div className="relative">
          <button
            onClick={() => !isCollapsed && setIsReportOpen(!isReportOpen)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group relative ${
              isReportActive 
                ? "bg-blue-600/10 text-blue-400" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            } ${isCollapsed ? "justify-center" : ""}`}
          >
            <reportMenu.icon 
              size={20} 
              className={`shrink-0 transition-colors ${isReportActive ? "text-blue-400" : ""}`} 
            />
            <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-sm flex-1 text-left ${
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            }`}>
              {reportMenu.name}
            </span>
            {!isCollapsed && (
              <ChevronDown 
                size={16} 
                className={`shrink-0 transition-transform duration-200 ${isReportOpen ? 'rotate-180' : ''}`} 
              />
            )}

            {isCollapsed && (
              <div className="absolute left-full ml-2 hidden rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-md group-hover:block whitespace-nowrap z-50">
                {reportMenu.name}
              </div>
            )}
          </button>

          {/* Submenu */}
          {!isCollapsed && isReportOpen && (
            <div className="mt-1 ml-4 pl-4 border-l border-slate-700 space-y-1">
              {reportMenu.children.map((child) => {
                const childActive = isActive(child.href);
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all text-sm ${
                      childActive 
                        ? "bg-blue-600/10 text-blue-400" 
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <child.icon size={16} className={`shrink-0 ${childActive ? "text-blue-400" : ""}`} />
                    <span className="font-medium">{child.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom menu items */}
        {bottomMenuItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group relative ${
                active 
                  ? "bg-blue-600/10 text-blue-400" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <item.icon 
                size={20} 
                className={`shrink-0 transition-colors ${active ? "text-blue-400" : ""}`} 
              />
              <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden text-sm ${
                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}>
                {item.name}
              </span>

              {isCollapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-slate-800 px-2 py-1 text-xs text-white shadow-md group-hover:block whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* --- FOOTER: USER DROPDOWN (Shadcn Style) --- */}
      <div className="p-3 mt-auto border-t border-slate-700/50" ref={dropdownRef}>
        <div className="relative">
          
          {/* 1. POPUP MENU (Muncul jika isDropdownOpen = true) */}
          {isDropdownOpen && (
            <div className={`absolute z-50 min-w-[14rem] rounded-lg border border-slate-700 bg-[#0f172a] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-200 ${
              // Logic Posisi: Kalau sidebar collapsed, menu muncul di KANAN. Kalau tidak, di ATAS.
              isCollapsed 
                ? "left-full bottom-0 ml-3" 
                : "bottom-full left-0 mb-3 w-full"
            }`}>
              
              {/* Header Menu (User Info) */}
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700">
                   <User size={16} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-white">{user?.name}</span>
                  <span className="truncate text-xs text-slate-400">{user?.role}</span>
                </div>
              </div>

              {/* <div className="my-1 h-px bg-slate-700" /> Separator */}

              {/* Menu Options (Opsional - biar mirip shadcn) */}
              {/* <div className="px-1 py-1">
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-not-allowed opacity-50">
                  <BadgeCheck size={16} />
                  Account
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-not-allowed opacity-50">
                  <CreditCard size={16} />
                  Billing
                </button>
              </div> */}

              <div className="my-1 h-px bg-slate-700" /> {/* Separator */}

              {/* Tombol Logout */}
              <button 
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}

          {/* 2. TRIGGER BUTTON (Tampilan Profil di Sidebar) */}
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-800 w-full ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 border border-slate-600">
               <User size={16} className="text-slate-300" />
            </div>

            {/* Info Teks (Hidden if collapsed) */}
            <div className={`grid flex-1 text-left text-sm leading-tight overflow-hidden transition-all duration-300 ${
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            }`}>
              <span className="truncate font-semibold text-white">{user?.name || 'User'}</span>
              <span className="truncate text-xs text-slate-400">{user?.role || 'Admin'}</span>
            </div>

            {/* Icon Chevron Up/Down (Hidden if collapsed) */}
            <ChevronsUpDown 
              size={16} 
              className={`ml-auto text-slate-400 shrink-0 transition-all ${
                isCollapsed ? "hidden" : ""
              }`} 
            />
          </button>

        </div>
      </div>
    </aside>
  );
}