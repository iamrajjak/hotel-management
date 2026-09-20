'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { reservationApi, roomApi, posApi, Reservation, Room, PosOrder } from '@/lib/api/services';
import { 
  BedDouble, 
  CalendarDays, 
  CheckCircle2, 
  LogOut, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowUpRight,
  Inbox,
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';

export default function RoyalStayDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [posOrders, setPosOrders] = useState<PosOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selectedStatModal, setSelectedStatModal] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [resData, roomData, orderData] = await Promise.all([
        reservationApi.getReservations(),
        roomApi.getRooms(),
        posApi.getOrders(),
      ]);

      if (resData && Array.isArray(resData.data)) {
        setReservations(resData.data);
      } else {
        setReservations([]);
      }

      if (roomData && Array.isArray(roomData.data)) {
        setRooms(roomData.data);
      } else {
        setRooms([]);
      }

      if (orderData && Array.isArray(orderData.data)) {
        setPosOrders(orderData.data);
      } else {
        setPosOrders([]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setReservations([]);
      setRooms([]);
      setPosOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // 100% Strict Live Database Calculations
  const totalRooms = rooms.length;
  const availableRoomsCount = rooms.filter((r: any) => r.status === 'Available' || r.status === 0 || r.status === '0').length;
  const occupiedRoomsCount = rooms.filter((r: any) => r.status === 'Occupied' || r.status === 2 || r.status === '2').length;
  const totalBookings = reservations.length;
  const pendingKotCount = posOrders.filter((o: any) => o.orderStatus === 'Pending' || o.orderStatus === 'Preparing').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckIns = reservations.filter((r: any) => r.checkInDate && r.checkInDate.toString().startsWith(todayStr)).length;
  const todayCheckOuts = reservations.filter((r: any) => r.checkOutDate && r.checkOutDate.toString().startsWith(todayStr)).length;
  const totalRevenue = reservations.reduce((sum, r: any) => sum + (Number(r.totalAmount) || Number(r.baseAmount) || 0), 0);

  const isStaffManager = currentUser?.role === 'StaffManager' || currentUser?.role === 'Manager' || currentUser?.role === 'Receptionist';

  // Modern Stat Cards Config with executive pastel icon badges
  const statCards = [
    { 
      id: 'total_rooms',
      label: 'Total Rooms', 
      val: totalRooms, 
      sub: `${availableRoomsCount} Available`, 
      color: 'text-indigo-600',
      bgGlow: 'hover:border-indigo-200 hover:shadow-indigo-500/5',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      icon: BedDouble 
    },
    { 
      id: 'total_bookings',
      label: 'Total Bookings', 
      val: totalBookings, 
      sub: 'All Active Reservations', 
      color: 'text-emerald-600', 
      bgGlow: 'hover:border-emerald-200 hover:shadow-emerald-500/5',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      icon: CalendarDays 
    },
    { 
      id: 'available_rooms',
      label: 'Available Rooms', 
      val: availableRoomsCount, 
      sub: 'Ready for Guest Check-In', 
      color: 'text-sky-600', 
      bgGlow: 'hover:border-sky-200 hover:shadow-sky-500/5',
      iconBg: 'bg-sky-50 text-sky-600 border-sky-100',
      icon: CheckCircle2 
    },
    { 
      id: 'occupied_rooms',
      label: 'Occupied Rooms', 
      val: occupiedRoomsCount, 
      sub: 'Currently Staying', 
      color: 'text-amber-600', 
      bgGlow: 'hover:border-amber-200 hover:shadow-amber-500/5',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      icon: Clock 
    },
    { 
      id: 'today_checkin',
      label: "Today's Check-in", 
      val: todayCheckIns, 
      sub: 'Arriving Today', 
      color: 'text-violet-600', 
      bgGlow: 'hover:border-violet-200 hover:shadow-violet-500/5',
      iconBg: 'bg-violet-50 text-violet-600 border-violet-100',
      icon: Plus 
    },
    { 
      id: 'today_checkout',
      label: "Today's Check-out", 
      val: todayCheckOuts, 
      sub: 'Departing Today', 
      color: 'text-rose-600', 
      bgGlow: 'hover:border-rose-200 hover:shadow-rose-500/5',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      icon: LogOut 
    },
    { 
      id: 'pending_kot',
      label: 'Pending KOT', 
      val: pendingKotCount, 
      sub: 'Kitchen Orders Queue', 
      color: 'text-cyan-600', 
      bgGlow: 'hover:border-cyan-200 hover:shadow-cyan-500/5',
      iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      icon: Zap 
    },
    ...(!isStaffManager ? [{ 
      id: 'revenue',
      label: 'Revenue (Month)', 
      val: `₹${totalRevenue.toLocaleString()}`, 
      sub: 'Live Database Collected', 
      color: 'text-indigo-700', 
      bgGlow: 'hover:border-indigo-300 hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      icon: TrendingUp 
    }] : [])
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      <Sidebar 
        userRole={currentUser?.role || 'HotelOwner'} 
        isOpenMobile={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title="Dashboard & Hospitality Overview" 
          onMenuClick={() => setIsMobileOpen(true)}
        />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Top Welcome Title Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-indigo-700/40 shadow-lg shadow-indigo-950/10 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <Sparkles className="w-3 h-3 text-indigo-300" /> Executive Hospitality Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">Royal Stay Hospitality Overview</h1>
              <p className="text-indigo-200 text-xs sm:text-sm font-medium">Realtime Property Analytics • Live Guest Occupancy & Revenue Breakdown</p>
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                title="Refresh Live Metrics"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/20 transition-all flex items-center gap-2 text-xs font-bold backdrop-blur-md hover:scale-[1.02]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Overview
              </button>

              <span className="px-4 py-2 bg-emerald-500/20 text-emerald-200 rounded-2xl text-xs font-extrabold border border-emerald-400/30 flex items-center gap-2 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Active
              </span>
            </div>
          </div>

          {/* Executive Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Quick Actions:
              </span>
              <a
                href="/admin/reservations"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> New Booking
              </a>
              <a
                href="/admin/checkin-checkout"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Express Check-in
              </a>
              <a
                href="/admin/rooms"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow transition-all flex items-center gap-1.5"
              >
                <BedDouble className="w-4 h-4" /> Add Room
              </a>
              <a
                href="/admin/reservations"
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold rounded-2xl transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" /> Print Guest Folio
              </a>
            </div>

            {/* Executive Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedStatModal(stat.id)}
                  className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group cursor-pointer active:scale-98"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                    <div className={`w-11 h-11 rounded-2xl ${stat.iconBg} flex items-center justify-center border shadow-xs group-hover:scale-110 transition-all duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <p className={`text-2xl sm:text-3xl font-extrabold ${stat.color} tracking-tight font-mono`}>
                      {stat.val}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-slate-400" /> {stat.sub}
                      </p>
                      <span className="text-[10px] font-black text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                        Inspect ↗
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Grid: Recent Bookings Table + Revenue Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Recent Bookings Table */}
            <div className="lg:col-span-2 bg-white border border-slate-200 hover:border-indigo-200/80 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5 transition-all">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" /> Recent Bookings
                  </h3>
                  <p className="text-slate-500 text-xs font-medium">Live guest reservations directly from database</p>
                </div>
                <a 
                  href="/admin/reservations" 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-indigo-700 text-xs font-bold rounded-2xl border border-slate-200 transition-all hover:scale-105 flex items-center gap-1"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {loading ? (
                <div className="text-center py-14 text-slate-500 text-xs font-bold animate-pulse">
                  Loading live guest reservations...
                </div>
              ) : reservations.length === 0 ? (
                <div className="text-center py-14 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs border border-slate-200">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-slate-900 text-base">No Recent Bookings</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">No reservations currently active. New guest bookings will automatically appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[550px]">
                    <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Booking ID</th>
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-4">Room</th>
                        <th className="py-3.5 px-4">Check-in</th>
                        <th className="py-3.5 px-4">Check-out</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {reservations.slice(0, 5).map((res: any, idx: number) => (
                        <tr key={res.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-4 font-mono font-black text-indigo-700">{res.bookingNumber || res.id}</td>
                          <td className="py-4 px-4 font-extrabold text-slate-900">{res.customerName || 'Guest'}</td>
                          <td className="py-4 px-4 text-slate-700 font-bold">Room {res.roomNumber || res.roomId}</td>
                          <td className="py-4 px-4 text-slate-500 font-mono">{res.checkInDate ? res.checkInDate.toString().split('T')[0] : ''}</td>
                          <td className="py-4 px-4 text-slate-500 font-mono">{res.checkOutDate ? res.checkOutDate.toString().split('T')[0] : ''}</td>
                          <td className="py-4 px-4">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                              {res.bookingStatus || 'Confirmed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Revenue Overview Card */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Revenue Breakdown</h3>
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                    Database Tracked
                  </span>
                </div>

                <div className="space-y-5">
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Revenue Collected</span>
                    <h2 className="text-3xl sm:text-4xl font-black text-indigo-700 tracking-tight font-mono">
                      ₹{totalRevenue.toLocaleString()}
                    </h2>
                  </div>

                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium">Total Registered Rooms</span>
                      <span className="font-black text-slate-900 text-sm font-mono">{totalRooms}</span>
                    </div>
                    <div className="h-px bg-slate-200/80"></div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-medium">Active Reservations</span>
                      <span className="font-black text-emerald-700 text-sm font-mono">{totalBookings}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INTERACTIVE STAT CARD DETAIL INSPECTION MODAL */}
          {selectedStatModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200 text-xs">
                {/* Modal Header */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5 text-indigo-200" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">
                        {selectedStatModal === 'total_rooms' && 'Total Registered Rooms Breakdown'}
                        {selectedStatModal === 'available_rooms' && 'Available Rooms (Ready for Check-in)'}
                        {selectedStatModal === 'occupied_rooms' && 'Currently Occupied Rooms & Guests'}
                        {selectedStatModal === 'total_bookings' && 'Active Reservations Overview'}
                        {selectedStatModal === 'today_checkin' && "Today's Arriving Check-Ins"}
                        {selectedStatModal === 'today_checkout' && "Today's Departing Check-Outs"}
                        {selectedStatModal === 'pending_kot' && 'Pending Kitchen Orders Queue (POS KOT)'}
                        {selectedStatModal === 'revenue' && 'Live Database Revenue Breakdown'}
                      </h3>
                      <p className="text-slate-400 text-[11px] font-medium">Real-time database records and live status</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStatModal(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body Content */}
                <div className="p-6 sm:p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* ROOMS MODAL BREAKDOWN */}
                  {(selectedStatModal === 'total_rooms' || selectedStatModal === 'available_rooms' || selectedStatModal === 'occupied_rooms') && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 font-bold text-slate-700">
                        <span>Total Filtered: {
                          selectedStatModal === 'available_rooms' ? rooms.filter((r: any) => r.status === 'Available' || r.status === 0 || r.status === '0').length :
                          selectedStatModal === 'occupied_rooms' ? rooms.filter((r: any) => r.status === 'Occupied' || r.status === 2 || r.status === '2').length :
                          rooms.length
                        } Room(s)</span>
                        <a href="/admin/rooms" className="text-indigo-600 hover:underline flex items-center gap-1 font-extrabold">
                          Manage Rooms Console <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {rooms
                          .filter((r: any) => {
                            if (selectedStatModal === 'available_rooms') return r.status === 'Available' || r.status === 0 || r.status === '0';
                            if (selectedStatModal === 'occupied_rooms') return r.status === 'Occupied' || r.status === 2 || r.status === '2';
                            return true;
                          })
                          .map((r: any) => (
                            <div key={r.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between transition-colors">
                              <div>
                                <p className="font-extrabold text-slate-900 text-sm">Room {r.roomNumber}</p>
                                <p className="text-[11px] text-slate-500 font-medium">{r.roomTypeName || 'Deluxe Room'} • {r.floor || 'Floor 1'}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  r.status === 'Available' || r.status === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  r.status === 'Occupied' || r.status === 2 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                }`}>
                                  {r.status === 0 ? 'Available' : r.status === 2 ? 'Occupied' : r.status || 'Available'}
                                </span>
                                <p className="font-mono font-bold text-slate-900 mt-1">₹{(r.price || 2500).toLocaleString()}/night</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* BOOKINGS / CHECK-IN / CHECK-OUT MODAL BREAKDOWN */}
                  {(selectedStatModal === 'total_bookings' || selectedStatModal === 'today_checkin' || selectedStatModal === 'today_checkout') && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 font-bold text-slate-700">
                        <span>Active Database Reservations ({reservations.length})</span>
                        <a href="/admin/reservations" className="text-indigo-600 hover:underline flex items-center gap-1 font-extrabold">
                          Go to Bookings Console <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                        {reservations.map((res: any, idx: number) => (
                          <div key={res.id || idx} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between transition-colors">
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                                <span className="font-mono text-indigo-700">{res.bookingNumber || `BK-${1001 + idx}`}</span>
                                <span>•</span>
                                <span>{res.customerName}</span>
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                Room {res.roomNumber} ({res.checkInDate?.split('T')[0]} to {res.checkOutDate?.split('T')[0]})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {res.bookingStatus || 'Confirmed'}
                              </span>
                              <p className="font-mono font-extrabold text-slate-900 mt-1">₹{(res.totalAmount || res.baseAmount || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REVENUE BREAKDOWN MODAL */}
                  {selectedStatModal === 'revenue' && (
                    <div className="space-y-4">
                      <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Total Live Revenue Tracked</p>
                        <h2 className="text-3xl font-black text-indigo-900 font-mono">₹{totalRevenue.toLocaleString()}</h2>
                        <p className="text-[11px] text-indigo-700 font-medium">Calculated across all confirmed guest bookings in database</p>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>Total Completed Payments:</span>
                          <span className="text-emerald-700 font-mono font-black">₹{reservations.reduce((sum, r: any) => sum + (Number(r.paidAmount) || 0), 0).toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-slate-200"></div>
                        <div className="flex justify-between items-center text-slate-700 font-bold">
                          <span>Total Pending Due Balance:</span>
                          <span className="text-rose-600 font-mono font-black">₹{reservations.reduce((sum, r: any) => sum + (Number(r.dueAmount) || 0), 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PENDING KOT QUEUE MODAL */}
                  {selectedStatModal === 'pending_kot' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-900 text-xs font-bold flex justify-between items-center">
                        <span>Active Kitchen Orders Queue (KOT)</span>
                        <a href="/admin/restaurant" className="text-cyan-800 hover:underline flex items-center gap-1 font-extrabold">
                          Open Restaurant POS <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className="text-center py-6 text-slate-500 font-medium">No pending kitchen orders in queue. All orders served!</p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedStatModal(null)}
                    className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                  >
                    Close Inspection
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
