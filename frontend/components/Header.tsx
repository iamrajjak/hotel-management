'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { authApi, reservationApi } from '@/lib/api/services';
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  Building2, 
  Menu, 
  Search, 
  X, 
  Calendar, 
  User, 
  Bed,
  Clock,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Star,
  Boxes,
  ArrowUpRight,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  userName?: string;
  userRole?: string;
  hotelName?: string;
  onMenuClick?: () => void;
}

export default function Header({
  title = 'Dashboard Overview',
  userName,
  userRole,
  hotelName,
  onMenuClick
}: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allReservations, setAllReservations] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Live Clock State
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationList, setNotificationList] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    // Sync theme mode preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('app_theme');
      const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
      document.documentElement.classList.toggle('dark', isDark);
    }

    // Initialize & Tick Live Realtime Clock
    setCurrentTime(new Date());
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

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

    fetchReservationsForSearch();

    return () => {
      clearInterval(clockTimer);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('user_info_updated', syncUser);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_theme', nextTheme ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', nextTheme);
    }
  };

  const fetchReservationsForSearch = async () => {
    try {
      const res = await reservationApi.getReservations();
      if (res.success && Array.isArray(res.data)) {
        setAllReservations(res.data);

        // Dynamically build notifications for current tenant hotel ONLY
        const dynamicList: any[] = [];
        res.data.forEach((r: any, idx: number) => {
          if (r.bookingStatus === 'CheckedIn') {
            dynamicList.push({
              id: `notif-checkout-${r.id || idx}`,
              title: 'Guest Departure Pending',
              message: `${r.customerName || 'Guest'} (Room ${r.roomNumber || 'N/A'}) checkout bill ready for settlement.`,
              time: 'Today',
              type: 'checkout',
              link: '/admin/checkin-checkout',
              read: false
            });
          } else if (r.bookingStatus === 'Confirmed' || r.bookingStatus === 'Pending') {
            dynamicList.push({
              id: `notif-checkin-${r.id || idx}`,
              title: 'Guest Check-In Due',
              message: `${r.customerName || 'Guest'} arriving today (Room ${r.roomNumber || 'N/A'}).`,
              time: 'Today',
              type: 'checkin',
              link: '/admin/checkin-checkout',
              read: false
            });
          }
          if (r.paymentStatus === 'Pending' || (r.dueAmount && r.dueAmount > 0)) {
            dynamicList.push({
              id: `notif-pay-${r.id || idx}`,
              title: 'Payment Balance Pending',
              message: `${r.customerName || 'Guest'} has pending balance of ₹${(r.dueAmount || r.totalAmount || 0).toLocaleString('en-IN')}.`,
              time: 'Due Now',
              type: 'checkout',
              link: '/admin/finance',
              read: false
            });
          }
        });

        setNotificationList(dynamicList);
        setUnreadCount(dynamicList.filter(n => !n.read).length);
      } else {
        setNotificationList([]);
        setUnreadCount(0);
      }
    } catch {
      setNotificationList([]);
      setUnreadCount(0);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const q = query.toLowerCase().trim();
    const filtered = allReservations.filter((r) =>
      r.bookingNumber?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerPhone?.toLowerCase().includes(q) ||
      r.roomNumber?.toLowerCase().includes(q)
    ).slice(0, 5);

    setSearchResults(filtered);
    setShowDropdown(true);
  };

  const markAllNotificationsAsRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const isSuperAdmin = currentUser?.isSuperAdmin === true || currentUser?.isSuperAdmin === 1 || currentUser?.isSuperAdmin === '1' || currentUser?.role === 'SuperAdmin' || userRole === 'SuperAdmin';
  const displayUserName = userName || currentUser?.fullName || (isSuperAdmin ? 'SaaS Administrator' : 'Hotel Admin');
  const displayUserRole = isSuperAdmin ? 'SUPERADMIN' : (userRole || currentUser?.role || 'HOTEL OWNER');
  const displayHotelName = hotelName || currentUser?.hotelName || 'Hotel Management System';

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutMsg, setLogoutMsg] = useState('');

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogoutAction = () => {
    setShowLogoutConfirm(false);
    setLogoutMsg('Successfully logged out. Redirecting to login portal...');
    setTimeout(() => {
      authApi.logout();
      router.push('/login');
    }, 800);
  };

  // Format Live Clock
  const formattedDate = currentTime
    ? currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
    : '';

  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    : '';

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate max-w-[140px] sm:max-w-[180px] hidden sm:block">{title}</h2>

        {/* Global Quick Search Bar */}
        <div className="relative flex-1 max-w-xs sm:max-w-md ml-1 sm:ml-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.trim() && setShowDropdown(true)}
              placeholder="Search Guest, Room #, Booking ID..."
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200/60 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Search Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Quick Search Results ({searchResults.length})</span>
                <button onClick={() => setShowDropdown(false)} className="text-slate-400 hover:text-slate-600">Close</button>
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {searchResults.map((res) => (
                    <div
                      key={res.id}
                      onClick={() => {
                        setShowDropdown(false);
                        router.push(`/admin/reservations?search=${encodeURIComponent(res.bookingNumber)}`);
                      }}
                      className="p-3 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{res.customerName}</span>
                          <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{res.bookingNumber}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Room {res.roomNumber} • {res.customerPhone}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        View <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No matching guests, rooms, or bookings found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* LIVE REALTIME CLOCK BADGE */}
        {currentTime && (
          <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-mono font-bold text-slate-800 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>{formattedDate}</span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-700">{formattedTime}</span>
          </div>
        )}



        {/* DARK / LIGHT THEME TOGGLE BUTTON */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center border border-slate-200/60 shadow-2xs"
          title={isDarkMode ? "Switch to Light Mode (White Screen)" : "Switch to Dark Mode (Black Screen)"}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-500 fill-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 fill-slate-700" />
          )}
        </button>

        {/* NOTIFICATION BELL & INTERACTIVE DRAWER POPOVER */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none touch-manipulation min-w-[40px] min-h-[40px]"
            title="Realtime Hotel Activity Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DRAWER / POPOVER */}
          {showNotifications && (
            <div className="fixed inset-x-4 top-18 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-auto md:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 duration-150 text-xs max-h-[85vh] flex flex-col">
              {/* Popover Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Live Activity Feed</h3>
                    <p className="text-[10px] text-slate-400">Realtime front desk & property notifications</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-[10px] text-indigo-300 hover:text-white font-bold bg-white/10 px-2 py-1 rounded-lg border border-white/10 transition-colors"
                    >
                      Read All
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification Items List */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notificationList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                    <p className="font-extrabold text-slate-800 text-xs">No Active Notifications</p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      All quiet! No pending check-ins or departures for <strong>{displayHotelName}</strong>.
                    </p>
                  </div>
                ) : (
                  notificationList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowNotifications(false);
                        router.push(item.link);
                      }}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors space-y-1 ${
                        !item.read ? 'bg-indigo-50/30' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          {item.type === 'checkout' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                          {item.type === 'kot' && <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />}
                          {item.type === 'checkin' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {item.type === 'review' && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                          {item.type === 'inventory' && <Boxes className="w-3.5 h-3.5 text-indigo-600" />}
                          <span>{item.title}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
                      </div>

                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{item.message}</p>

                      <div className="pt-1 flex justify-end">
                        <span className="text-[10px] font-extrabold text-indigo-600 flex items-center gap-0.5 hover:underline">
                          Open Action <ArrowUpRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Hotel OS • Live Activity Engine
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm shadow-indigo-500/20">
            {displayUserName.charAt(0)}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-extrabold text-slate-900 leading-tight">{displayUserName}</p>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{displayUserRole}</p>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1 sm:ml-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Logout Toast Notification Popup */}
      {logoutMsg && (
        <div className="fixed top-20 right-6 bg-slate-900 text-white border border-indigo-500/30 px-5 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">✓</div>
          <span className="text-xs font-bold">{logoutMsg}</span>
        </div>
      )}

      {/* Custom Ultra-Premium Glassmorphic Logout Confirmation Modal */}
      {showLogoutConfirm && mounted && createPortal(
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[999999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 text-center space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden my-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Confirm Logout</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Are you sure you want to log out of <strong className="text-slate-800 dark:text-slate-200 font-bold">{displayHotelName}</strong>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-200/60 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogoutAction}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Yes, Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
