import React, { useState, useEffect } from 'react';
import { X, Printer, Building2, CheckCircle2, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { Reservation, posApi, PosOrder } from '@/lib/api/services';
import HotelLogo from '@/components/HotelLogo';

interface GuestFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  hotelName?: string;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelGst?: string;
}

export default function GuestFolioModal({
  isOpen,
  onClose,
  reservation,
  hotelName = 'Grand Palace Hotel & Resorts',
  hotelAddress = '123 Luxury Boulevard, City Center, Heritage District',
  hotelPhone = '+91 98765 00001',
  hotelGst = '07AAAAA0000A1Z5'
}: GuestFolioModalProps) {
  const [foodOrders, setFoodOrders] = useState<PosOrder[]>([]);

  useEffect(() => {
    if (isOpen && reservation) {
      fetchFoodOrders();
    }
  }, [isOpen, reservation]);

  async function fetchFoodOrders() {
    if (!reservation) return;
    try {
      const res = await posApi.getOrders();
      if (res && Array.isArray(res.data)) {
        const matched = res.data.filter((o) => 
          o.reservationId === reservation.id ||
          o.roomId === reservation.roomId ||
          (reservation.roomNumber && o.roomNumber === reservation.roomNumber)
        );
        setFoodOrders(matched);
      }
    } catch {
      setFoodOrders([]);
    }
  }

  if (!isOpen || !reservation) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedCheckIn = new Date(reservation.checkInDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formattedCheckOut = new Date(reservation.checkOutDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-guest-folio, #printable-guest-folio * {
            visibility: visible !important;
          }
          #printable-guest-folio {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      <div id="printable-guest-folio" className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="font-extrabold text-sm tracking-wide">Guest Folio & Official Tax Invoice</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-md hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>Direct Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Folio Content */}
        <div className="p-8 sm:p-10 overflow-y-auto print:p-0 print:overflow-visible text-slate-800 space-y-6">
          {/* Printable Header with Luxury Logo */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-6">
            <div className="space-y-1">
              <HotelLogo variant="print" size="lg" hotelName={hotelName.toUpperCase()} subTitle="OFFICIAL TAX INVOICE & GUEST FOLIO" />
              <p className="text-xs text-slate-500 mt-2 max-w-xs">{hotelAddress}</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">Phone: {hotelPhone} | GSTIN: {hotelGst}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3.5 py-1 bg-slate-950 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-sm">
                OFFICIAL GUEST FOLIO
              </span>
              <p className="text-xs font-mono font-extrabold text-slate-900 mt-2">
                Booking #: <span className="text-indigo-600">{reservation.bookingNumber}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Issued: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Guest & Stay Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">GUEST NAME</p>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">{reservation.customerName}</p>
              <p className="text-[11px] text-slate-500 font-medium">{reservation.customerPhone}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ROOM DETAILS</p>
              <p className="font-extrabold text-indigo-700 text-sm mt-0.5">Room {reservation.roomNumber}</p>
              <p className="text-[11px] text-slate-500 font-medium">{reservation.roomTypeName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CHECK-IN</p>
              <p className="font-extrabold text-slate-900 text-xs mt-0.5">{formattedCheckIn}</p>
              <p className="text-[11px] text-slate-500 font-medium">{reservation.adults} Adults, {reservation.children} Child</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CHECK-OUT</p>
              <p className="font-extrabold text-slate-900 text-xs mt-0.5">{formattedCheckOut}</p>
              <p className="text-[11px] text-slate-500 font-medium">Duration: {nights} Night(s)</p>
            </div>
          </div>

          {/* Charges Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-center">Qty / Nights</th>
                  <th className="py-2.5 px-4 text-right">Rate</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{reservation.roomTypeName} Accommodation</p>
                    <p className="text-[11px] text-slate-500">Room {reservation.roomNumber} ({formattedCheckIn} to {formattedCheckOut})</p>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">{nights}</td>
                  <td className="py-3 px-4 text-right text-slate-700">₹{(reservation.baseAmount / nights).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{reservation.baseAmount.toLocaleString('en-IN')}</td>
                </tr>

                {foodOrders.map((ord, idx) => (
                  <tr key={ord.id || idx} className="bg-amber-50/40 text-slate-800">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" /> Restaurant / KOT Food Order ({ord.orderNumber})
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {ord.orderItems && ord.orderItems.length > 0
                          ? ord.orderItems.map((i) => `${i.itemName} (x${i.quantity})`).join(', ')
                          : 'In-Room Dining / Food Service'}
                      </p>
                      <div className="mt-1">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          ord.paymentStatus === 'ChargedToRoom' || ord.paymentStatus === 'Pending'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          Status: {ord.paymentStatus === 'ChargedToRoom' ? 'Charged to Room Folio (Pending Settlement)' : ord.paymentStatus === 'Paid' ? 'Settled & Paid' : 'Pending Payment'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {ord.orderItems?.reduce((sum, i) => sum + i.quantity, 0) || 1}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">₹{ord.subtotal.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">₹{ord.total.toLocaleString('en-IN')}</td>
                  </tr>
                ))}

                {reservation.discountAmount > 0 && (
                  <tr className="text-emerald-700 font-semibold bg-emerald-50/40">
                    <td className="py-2.5 px-4">Promotional Discount Applied</td>
                    <td className="py-2.5 px-4 text-center">-</td>
                    <td className="py-2.5 px-4 text-right">-</td>
                    <td className="py-2.5 px-4 text-right font-extrabold">-₹{reservation.discountAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}

                {reservation.taxAmount > 0 && (
                  <tr className="text-slate-600">
                    <td className="py-2.5 px-4">Goods & Services Tax (GST 12%)</td>
                    <td className="py-2.5 px-4 text-center">-</td>
                    <td className="py-2.5 px-4 text-right">-</td>
                    <td className="py-2.5 px-4 text-right font-bold">₹{reservation.taxAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Breakdown & Status Stamp */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-6">
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Status</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-xs uppercase tracking-wide shadow-xs">
                {reservation.dueAmount === 0 ? (
                  <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 px-3 py-1 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    PAID IN FULL
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border-amber-200 px-3 py-1 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    BALANCE DUE: ₹{reservation.dueAmount.toLocaleString('en-IN')}
                  </span>
                )}
              </div>

              {reservation.specialRequest && (
                <p className="text-xs text-slate-500 italic mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700">Special Notes:</span> {reservation.specialRequest}
                </p>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600 font-medium">
                <span>Subtotal Base Amount:</span>
                <span className="font-bold text-slate-900">₹{reservation.baseAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600 font-medium">
                <span>Taxes & Charges:</span>
                <span className="font-bold text-slate-900">₹{reservation.taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600 font-medium">
                <span>Total Amount Paid:</span>
                <span className="font-bold text-emerald-700">₹{reservation.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-black border-t-2 border-slate-900 text-slate-900">
                <span>Net Payable:</span>
                <span className="text-indigo-700">₹{reservation.totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="border-t border-slate-200 pt-8 mt-6 flex justify-between items-end text-xs text-slate-400">
            <div>
              <p className="font-bold text-slate-700">Thank you for staying with us!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Computer generated tax invoice. No signature required.</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-300 mb-1"></div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
