'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import HotelLogo from '@/components/HotelLogo';
import { 
  Crown,
  LayoutDashboard, 
  BedDouble, 
  CalendarDays, 
  Users, 
  LogOut, 
  CreditCard, 
  Star, 
  Settings, 
  ShieldCheck,
  Utensils,
  Receipt,
  UserCheck,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

interface SidebarProps {
  userRole?: string;
  hotelName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  userRole, 
  hotelName,
  isOpenMobile = false,
  onCloseMobile
}: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  React.useEffect(() => {
    const syncUser = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('user_info');
        if (stored) {
          try {
            setCurrentUser(JSON.parse(stored));
          } catch {}
        }
      }
    };
    syncUser();

    window.addEventListener('storage', syncUser);
    window.addEventListener('user_info_updated', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user_info_updated', syncUser);
    };
  }, []);

  const storedRole = (currentUser?.role || '').toString().trim();
  const activeRole = storedRole ? storedRole : (userRole || 'HotelOwner');
  const normalizedRole = activeRole.toUpperCase();

  const isSuperAdmin = currentUser?.isSuperAdmin === true || currentUser?.isSuperAdmin === 1 || currentUser?.isSuperAdmin === '1' || normalizedRole === 'SUPERADMIN' || userRole === 'SuperAdmin';
  const isOwner = isSuperAdmin || normalizedRole === 'HOTELOWNER' || normalizedRole === 'OWNER' || normalizedRole === 'ADMIN';

  const displayUserRole = isSuperAdmin ? 'SuperAdmin' : (isOwner ? 'HotelOwner' : (storedRole || userRole || 'StaffManager'));
  const displayHotelName = hotelName || currentUser?.hotelName || 'Hotel Management System';

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Rooms', href: '/admin/rooms', icon: BedDouble },
    { label: 'Bookings', href: '/admin/reservations', icon: CalendarDays },
    { label: 'Guests', href: '/admin/customers', icon: Users },
    { label: 'Front Desk', href: '/admin/checkin-checkout', icon: LogOut },
    { label: 'Restaurant / KOT', href: '/admin/restaurant', icon: Utensils },
    ...(isOwner ? [{ label: 'Expenses', href: '/admin/expenses', icon: Receipt }] : []),
    { label: 'Staff & Attendance', href: '/admin/staff', icon: UserCheck },
    ...(isOwner ? [{ label: 'Reports', href: '/admin/reports', icon: BarChart3 }] : []),
    ...(isOwner ? [{ label: 'Payments', href: '/admin/finance', icon: CreditCard }] : []),
    { label: 'Reviews', href: '/admin/reviews', icon: Star },
    ...(isOwner ? [{ label: 'Settings', href: '/admin/settings', icon: Settings }] : []),
  ];

  if (isSuperAdmin) {
    navItems.unshift({ label: 'Super Admin', href: '/super-admin', icon: ShieldCheck });
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0F172A] text-slate-200 flex flex-col shadow-xl border-r border-slate-800/90 flex-shrink-0 z-50 transition-transform duration-300
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800/90 flex items-center justify-between">
          <HotelLogo variant="dark" size="sm" hotelName={displayHotelName} subTitle="LUXURY HOTEL & RESORTS" />

          {/* Close Button for Mobile */}
          <button 
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3.5 py-6 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-black text-slate-400/80 uppercase tracking-widest px-3 mb-2.5">
            MAIN MENU
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 scale-[1.01]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white fill-white/20' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Role Badge */}
        <div className="p-4 border-t border-slate-800/90 bg-[#0B1120] text-xs flex justify-between items-center">
          <span className="text-slate-400 font-semibold text-[11px]">Role:</span>
          <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-black uppercase text-[10px] tracking-wider">
            {displayUserRole}
          </span>
        </div>
      </aside>
    </>
  );
}
