'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { reportApi } from '@/lib/api/services';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  BedDouble, 
  CalendarDays, 
  UtensilsCrossed, 
  Users, 
  PieChart, 
  Printer, 
  Sparkles, 
  ShieldAlert,
  ArrowUpRight,
  Filter,
  DollarSign,
  Activity
} from 'lucide-react';

export default function ReportsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [rangePreset, setRangePreset] = useState<'today' | '7days' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeTab, setActiveTab] = useState<'pnl' | 'occupancy' | 'restaurant' | 'staff'>('pnl');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user_info');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);
          if (user.role === 'StaffManager') {
            setActiveTab('occupancy'); // Default to operational for StaffManager
          }
        } catch {}
      }
    }
    loadReportData();
  }, [rangePreset, startDate, endDate]);

  async function loadReportData() {
    setLoading(true);
    try {
      const [pnlRes, staffRes, occRes, restRes, bookRes] = await Promise.all([
        reportApi.getPnlReport(startDate, endDate),
        reportApi.getStaffReport(startDate, endDate),
        reportApi.getOccupancyReport(startDate, endDate),
        reportApi.getRestaurantReport(startDate, endDate),
        reportApi.getBookingReport(startDate, endDate),
      ]);

      const combined: any = {
        ...(pnlRes?.data || {}),
        // Staff Report Fields
        totalStaffCount: staffRes?.data?.totalStaff || staffRes?.data?.activeStaff || 0,
        activeStaffCount: staffRes?.data?.activeStaff || 0,
        presentToday: staffRes?.data?.presentToday || 0,
        absentToday: staffRes?.data?.absentToday || 0,
        leaveToday: staffRes?.data?.leaveToday || 0,
        totalMonthlySalaryExpense: staffRes?.data?.totalMonthlySalaryExpense || 0,
        // Occupancy Fields
        totalRooms: occRes?.data?.totalRooms || 0,
        occupiedRoomsCount: occRes?.data?.occupiedRooms || 0,
        reservedRoomsCount: occRes?.data?.reservedRooms || 0,
        availableRoomsCount: occRes?.data?.availableRooms || 0,
        occupancyPercentage: occRes?.data?.occupancyRatePercentage || 0,
        averageDailyRate: occRes?.data?.averageDailyRate || 0,
        revPar: occRes?.data?.revPar || 0,
        // Booking Fields
        totalBookings: bookRes?.data?.totalBookings || 0,
        // Restaurant Fields
        totalKotOrders: restRes?.data?.totalOrders || 0,
        dineInOrders: restRes?.data?.dineInOrders || 0,
        roomServiceOrders: restRes?.data?.roomServiceOrders || 0,
        takeawayOrders: restRes?.data?.takeawayOrders || 0,
        totalRestaurantSales: restRes?.data?.totalRestaurantSales || pnlRes?.data?.restaurantRevenue || 0,
      };

      setReportData(combined);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  }

  const isHotelOwner = currentUser?.role === 'HotelOwner' || currentUser?.role === 'SuperAdmin' || currentUser?.isSuperAdmin;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar userRole={currentUser?.role || 'HotelOwner'} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Executive Business Reports & Analytics" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Blue Analytics Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl border border-blue-800/40 shadow-xl shadow-blue-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-blue-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-300" /> Business Analytics & Reports
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                  {isHotelOwner ? 'Full P&L Analytics' : 'Operational Performance View'}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Hotel Financial & Operational Performance</h1>
                <p className="text-blue-200/90 text-xs sm:text-sm font-medium mt-1">
                  {isHotelOwner 
                    ? 'Analyze Profit & Loss statements, room occupancy rates, restaurant revenues, and net profit margins' 
                    : 'Analyze room occupancy rates, guest booking volume, and restaurant kitchen order metrics'}
                </p>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="relative z-10 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-extrabold text-xs tracking-wide uppercase flex items-center justify-center gap-2.5 backdrop-blur-md transition-all hover:scale-105 active:scale-95 self-start lg:self-center"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report PDF</span>
            </button>
          </div>

          {/* Report Tab Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {isHotelOwner && (
                <button
                  onClick={() => setActiveTab('pnl')}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                    activeTab === 'pnl'
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> P&L Profit & Loss Statement
                </button>
              )}

              <button
                onClick={() => setActiveTab('occupancy')}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'occupancy'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <BedDouble className="w-4 h-4 text-sky-400" /> Room Occupancy & Bookings
              </button>

              <button
                onClick={() => setActiveTab('restaurant')}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'restaurant'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-amber-400" /> Restaurant POS Sales
              </button>

              <button
                onClick={() => setActiveTab('staff')}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 ${
                  activeTab === 'staff'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Users className="w-4 h-4 text-violet-400" /> Staff Attendance Report
              </button>
            </div>
          </div>

          {/* TAB 1: P&L PROFIT & LOSS STATEMENT (HotelOwner Only) */}
          {activeTab === 'pnl' && isHotelOwner && (
            <div className="space-y-6">
              {/* Executive Financial Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Gross Hotel Revenue</span>
                  <h3 className="text-3xl font-black text-indigo-700 font-mono">
                    ₹{((reportData?.totalRoomRevenue || 0) + (reportData?.totalRestaurantRevenue || 0)).toLocaleString()}
                  </h3>
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-1">
                    <span>Rooms: ₹{(reportData?.totalRoomRevenue || 0).toLocaleString()}</span>
                    <span>Restaurant: ₹{(reportData?.totalRestaurantRevenue || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Operating Expenses</span>
                  <h3 className="text-3xl font-black text-rose-600 font-mono">
                    ₹{(reportData?.totalExpenses || 0).toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Logged utilities, repairs, and overheads</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-indigo-200 shadow-md space-y-2 bg-gradient-to-br from-indigo-50/50 to-white">
                  <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Net Profit Margin
                  </span>
                  <h3 className={`text-3xl font-black font-mono ${
                    (reportData?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    ₹{(reportData?.netProfit || 0).toLocaleString()}
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-700">
                    Profitability Ratio: {
                      (((reportData?.totalRoomRevenue || 0) + (reportData?.totalRestaurantRevenue || 0)) > 0)
                        ? `${(((reportData?.netProfit || 0) / ((reportData?.totalRoomRevenue || 0) + (reportData?.totalRestaurantRevenue || 0))) * 100).toFixed(1)}% Net Margin`
                        : '0%'
                    }
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown Card */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="font-extrabold text-slate-900 text-base">Statement of Income & Expenditure</h3>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Strict Multi-Tenant Database Derived
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Line Item / Revenue Source</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-slate-900">Room Booking Income (Check-in Folios)</td>
                      <td className="py-3.5 px-4 text-right font-black text-indigo-700 font-mono">₹{(reportData?.totalRoomRevenue || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-slate-900">Restaurant & Food POS Sales</td>
                      <td className="py-3.5 px-4 text-right font-black text-indigo-700 font-mono">₹{(reportData?.totalRestaurantRevenue || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-indigo-50/50">
                      <td className="py-3.5 px-4 font-black text-slate-900">TOTAL GROSS REVENUE</td>
                      <td className="py-3.5 px-4 text-right font-black text-indigo-900 font-mono text-sm">
                        ₹{((reportData?.totalRoomRevenue || 0) + (reportData?.totalRestaurantRevenue || 0)).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 text-slate-700">Less: Operational Expenses & Maintenance Outflows</td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600 font-mono">-₹{(reportData?.totalExpenses || 0).toLocaleString()}</td>
                    </tr>
                    <tr className="bg-emerald-50/60 border-t-2 border-emerald-300">
                      <td className="py-4 px-4 font-black text-emerald-900 text-sm">NET OPERATING PROFIT / (LOSS)</td>
                      <td className="py-4 px-4 text-right font-black text-emerald-800 font-mono text-base">
                        ₹{(reportData?.netProfit || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ROOM OCCUPANCY & BOOKINGS */}
          {activeTab === 'occupancy' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Occupancy Rate</span>
                  <h3 className="text-3xl font-black text-sky-600 font-mono">
                    {reportData?.occupancyPercentage || 0}%
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Currently stayed rooms vs total inventory</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Bookings Count</span>
                  <h3 className="text-3xl font-black text-indigo-700 font-mono">
                    {reportData?.totalBookings || 0}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Active reservations in period</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-sans">Occupied Rooms Count</span>
                  <h3 className="text-3xl font-black text-amber-600 font-mono">
                    {reportData?.occupiedRoomsCount || 0} / {reportData?.totalRooms || 0}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Rooms checked-in right now</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESTAURANT POS SALES */}
          {activeTab === 'restaurant' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Restaurant Sales</span>
                  <h3 className="text-3xl font-black text-amber-600 font-mono">
                    ₹{(reportData?.totalRestaurantRevenue || 0).toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Combined Room service + Dine-in POS tickets</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Kitchen Orders (KOT)</span>
                  <h3 className="text-3xl font-black text-cyan-600 font-mono">
                    {reportData?.totalKotOrders || 0} Tickets
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Generated kitchen tickets</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STAFF ATTENDANCE */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Active Staff Members</span>
                  <h3 className="text-3xl font-black text-violet-700 font-mono">
                    {reportData?.totalStaffCount || 0} Members
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Active registered hotel staff</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-emerald-200/80 shadow-sm space-y-1 bg-emerald-50/20">
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Present Today</span>
                  <h3 className="text-3xl font-black text-emerald-600 font-mono">
                    {reportData?.presentToday || 0} Present
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Marked present on shift</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-rose-200/80 shadow-sm space-y-1 bg-rose-50/20">
                  <span className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">Absent Today</span>
                  <h3 className="text-3xl font-black text-rose-600 font-mono">
                    {reportData?.absentToday || 0} Absent
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Unexcused absence</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-indigo-200/80 shadow-sm space-y-1 bg-indigo-50/20">
                  <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">On Leave Today</span>
                  <h3 className="text-3xl font-black text-indigo-600 font-mono">
                    {reportData?.leaveToday || 0} On Leave
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Approved leave</p>
                </div>
              </div>

              {isHotelOwner && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-1">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Monthly Salary Outflow</span>
                  <h3 className="text-3xl font-black text-emerald-600 font-mono">
                    ₹{(reportData?.totalMonthlySalaryExpense || 0).toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Monthly staff payroll Commitment</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
