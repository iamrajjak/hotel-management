'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { calendarApi, CalendarMatrixResponse, CalendarBookingEvent } from '@/lib/api/services';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BedDouble, User, Phone, CheckCircle, Info, X } from 'lucide-react';

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<CalendarMatrixResponse | null>(null);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedBooking, setSelectedBooking] = useState<CalendarBookingEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar(startDate);
  }, [startDate]);

  async function loadCalendar(startStr: string) {
    setLoading(true);
    const start = new Date(startStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 14);

    const res = await calendarApi.getCalendar(start.toISOString(), end.toISOString());
    if (res.data) {
      setCalendarData(res.data);
    }
    setLoading(false);
  }

  // Generate array of 14 dates starting from startDate
  const dateList: Date[] = [];
  const curr = new Date(startDate);
  for (let i = 0; i < 14; i++) {
    dateList.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const shiftDates = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header title="Interactive Booking Calendar Matrix" />

        <main className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto">
          {/* Executive Dark Calendar Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-sky-900 to-slate-900 p-6 sm:p-8 rounded-3xl border border-sky-800/40 shadow-xl shadow-indigo-950/10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white/10 text-sky-200 text-[10px] font-extrabold uppercase tracking-wider border border-white/20 flex items-center gap-1.5 backdrop-blur-md">
                  <CalendarIcon className="w-3.5 h-3.5 text-sky-300" /> Interactive Room Stays Matrix
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-400/30">
                  14-Day Timeline View
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">Occupancy Timeline & Calendar</h1>
                <p className="text-sky-200/90 text-xs sm:text-sm font-medium mt-1">Visual timeline view of room reservations, guest stay durations, and room availability</p>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-3 self-start lg:self-center">
              <button
                onClick={() => shiftDates(-14)}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-md hover:scale-105"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="px-4 py-2.5 bg-white/10 rounded-2xl border border-white/20 text-xs font-mono font-extrabold text-white backdrop-blur-md shadow-inner">
                {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {dateList[13]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>

              <button
                onClick={() => shiftDates(14)}
                className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all backdrop-blur-md hover:scale-105"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-6 px-2 text-xs font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              <span>CheckedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Confirmed Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span>Maintenance / Out of Order</span>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                    <th className="py-4 px-4 min-w-[140px] sticky left-0 bg-slate-950 z-10">Room</th>
                    {dateList.map((d, i) => (
                      <th key={i} className="py-3 px-2 text-center min-w-[80px] border-l border-slate-800/60">
                        <p className="uppercase text-[10px] text-slate-500">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{d.getDate()}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {calendarData?.roomRows.map((row) => (
                    <tr key={row.roomId} className="hover:bg-slate-800/30 transition-colors">
                      {/* Room Column */}
                      <td className="py-3 px-4 font-bold text-white sticky left-0 bg-slate-900 z-10 shadow-lg">
                        <p className="text-sm">Room {row.roomNumber}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{row.roomTypeName}</p>
                      </td>

                      {/* 14 Date Cells */}
                      {dateList.map((dateObj, dIdx) => {
                        const dateStr = dateObj.toISOString().split('T')[0];

                        // Find matching booking for this room & date
                        const booking = row.bookings.find((b) => {
                          const inD = b.checkInDate.split('T')[0];
                          const outD = b.checkOutDate.split('T')[0];
                          return dateStr >= inD && dateStr < outD;
                        });

                        return (
                          <td key={dIdx} className="p-1 border-l border-slate-800/40 text-center h-14 relative">
                            {booking ? (
                              <button
                                onClick={() => setSelectedBooking(booking)}
                                className={`w-full h-full rounded-lg p-1 text-[10px] font-bold text-left overflow-hidden shadow-md transition-transform hover:scale-[1.03] ${
                                  booking.bookingStatus === 'CheckedIn'
                                    ? 'bg-indigo-600/90 text-white border border-indigo-400'
                                    : booking.bookingStatus === 'Confirmed'
                                    ? 'bg-amber-600/90 text-white border border-amber-400'
                                    : 'bg-emerald-600/90 text-white border border-emerald-400'
                                }`}
                              >
                                <p className="truncate leading-tight">{booking.customerName}</p>
                                <p className="text-[9px] opacity-80 truncate">{booking.bookingNumber}</p>
                              </button>
                            ) : (
                              <div className="w-full h-full rounded-lg bg-slate-950/40 hover:bg-emerald-500/10 border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-600 hover:text-emerald-400 transition-colors cursor-pointer">
                                Free
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Selected Booking Info Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                {selectedBooking.bookingStatus}
              </span>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Booking Reference</p>
                <p className="text-xl font-extrabold text-white">{selectedBooking.bookingNumber}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Guest Name:</span>
                  <span className="font-bold text-white">{selectedBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-200">{selectedBooking.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dates:</span>
                  <span className="font-medium text-indigo-400">
                    {new Date(selectedBooking.checkInDate).toLocaleDateString()} - {new Date(selectedBooking.checkOutDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Price:</span>
                  <span className="font-extrabold text-white">₹{selectedBooking.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full bg-slate-800 hover:bg-slate-750 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
