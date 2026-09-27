'use client';

import React, { useEffect, useState, use } from 'react';
import { apiClient } from '@/lib/api/client';
import { Printer, Building2, ShieldCheck, Phone, Mail, CheckCircle2, FileText, Link as LinkIcon, Check, Utensils } from 'lucide-react';

interface FoodOrderItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  issuedDate: string;
  hotel: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    gstNumber: string;
    bankName: string;
    accountNo: string;
    ifscCode: string;
    upiId: string;
    logoUrl?: string;
  };
  guest: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  booking: {
    bookingNumber: string;
    roomNumber: string;
    roomType: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults: number;
    children: number;
  };
  financials: {
    baseAmount: number;
    foodAmount?: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
  };
  foodOrders?: FoodOrderItem[];
  payments: Array<{
    date: string;
    amount: number;
    method: string;
    transactionId: string;
  }>;
}

function parseBillToken(token: string): string {
  if (!token) return '';
  let cleaned = token.trim();

  // URL decode if needed
  try {
    cleaned = decodeURIComponent(cleaned).trim();
  } catch {}

  // Strip prefixes
  if (cleaned.startsWith('inv-b64-')) {
    cleaned = cleaned.replace('inv-b64-', '').trim();
  } else if (cleaned.startsWith('b64-')) {
    cleaned = cleaned.replace('b64-', '').trim();
  } else if (cleaned.startsWith('inv-')) {
    const rem = cleaned.replace('inv-', '').trim();
    if (rem.startsWith('BK-') || rem.startsWith('bk-') || /^\d+$/.test(rem)) {
      return rem.toUpperCase().startsWith('BK-') ? rem.toUpperCase() : `BK-${rem}`;
    }
    cleaned = rem;
  }

  // Remove interior spaces
  cleaned = cleaned.replace(/\s+/g, '');

  // Direct check if it's already a booking code
  if (cleaned.toUpperCase().startsWith('BK-') || cleaned.toUpperCase().startsWith('RES-')) {
    return cleaned.toUpperCase();
  }

  // Base64 decode attempt
  try {
    let b64 = cleaned;
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const decoded = atob(b64).trim();
    if (decoded && (decoded.toUpperCase().startsWith('BK-') || decoded.includes('-') || decoded.length >= 3)) {
      return decoded;
    }
  } catch {}

  return cleaned;
}

export default function PublicGuestBillPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const rawToken = resolvedParams.id || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!rawToken) {
      setError('Invoice identifier missing');
      setLoading(false);
      return;
    }

    const decodedId = parseBillToken(rawToken);

    async function loadPublicInvoice() {
      setLoading(true);
      try {
        const res = await apiClient<InvoiceData>(`/invoices/reservation/${encodeURIComponent(decodedId)}`);
        if (res.success && res.data) {
          setInvoice(res.data);
        } else {
          setError(res.message || 'Invoice record not found');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching invoice details');
      } finally {
        setLoading(false);
      }
    }

    loadPublicInvoice();
  }, [rawToken]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-bold text-sm tracking-wide animate-pulse">Loading Official Guest Invoice Receipt...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-100">Bill Receipt Unavailable</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{error || 'Could not retrieve tax invoice for this booking token.'}</p>
        </div>
      </div>
    );
  }

  const { hotel, guest, booking, financials } = invoice;
  const isPaid = financials.dueAmount <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 py-8 px-4 font-sans print:bg-white print:p-0 print:text-black">
      {/* Action Header Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">{hotel.name}</h1>
            <p className="text-xs text-slate-400">Official Guest Bill Receipt #{invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF Bill 🖨️</span>
          </button>
        </div>
      </div>

      {/* Main Tax Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* Top Header Banner */}
        <div className="bg-slate-900 text-white p-8 sm:p-10 flex flex-wrap justify-between items-start gap-6 border-b border-slate-800 print:bg-white print:text-slate-900 print:p-0 print:border-b-2 print:border-slate-900 print:mb-6">
          <div className="space-y-2 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-xl print:text-slate-900 print:border-slate-900">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white print:text-slate-900">{hotel.name}</h2>
            </div>
            <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed">
              {hotel.address}, {hotel.city}, {hotel.state} - {hotel.pincode}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 print:text-slate-600 pt-1">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {hotel.phone}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {hotel.email}</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-bold print:text-slate-900 pt-1">
              GSTIN: <span className="font-mono tracking-wider">{hotel.gstNumber || '30AAAAA0000A1Z5'}</span>
            </p>
          </div>

          <div className="text-right space-y-2">
            <div className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs uppercase tracking-widest border border-emerald-500/30 print:border-slate-900 print:text-slate-900">
              OFFICIAL TAX INVOICE
            </div>
            <h3 className="text-xl font-mono font-bold text-white print:text-slate-900">{invoice.invoiceNumber}</h3>
            <p className="text-xs text-slate-400 print:text-slate-600">Date: {invoice.issuedDate}</p>
          </div>
        </div>

        {/* Invoice Details Container */}
        <div className="p-8 sm:p-10 space-y-8">
          {/* Guest & Stay Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Billed To (Guest)</span>
              <h4 className="text-base font-black text-slate-900">{guest.name}</h4>
              <p className="text-slate-600 font-medium">{guest.phone}</p>
              <p className="text-slate-500">{guest.email}</p>
            </div>

            <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-6">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Stay & Booking Details</span>
              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">Booking ID:</span>
                  <span className="font-mono font-bold text-slate-900">{booking.bookingNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Room Number:</span>
                  <span className="font-bold text-slate-900">Room {booking.roomNumber} ({booking.roomType})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Check-In Date:</span>
                  <span className="font-semibold text-slate-800">{booking.checkInDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Check-Out Date:</span>
                  <span className="font-semibold text-slate-800">{booking.checkOutDate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charges Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Nights / Qty</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    Room Accommodations ({booking.roomType} - Room {booking.roomNumber})
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">{booking.nights} Night(s)</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">₹{financials.baseAmount?.toLocaleString()}</td>
                </tr>

                {/* Food & Beverage Orders */}
                {invoice.foodOrders && invoice.foodOrders.length > 0 && (
                  <>
                    <tr className="bg-slate-100/70 border-t border-b border-slate-200">
                      <td colSpan={3} className="py-2 px-4 font-extrabold text-slate-800 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-amber-600" />
                        <span>In-Room Dining & Restaurant Orders (KOT)</span>
                      </td>
                    </tr>
                    {invoice.foodOrders.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-medium text-slate-800 pl-6">
                          • {item.description}
                        </td>
                        <td className="py-2.5 px-4 text-center font-semibold text-slate-600">
                          {item.quantity} x ₹{item.unitPrice}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{item.amount?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {financials.taxAmount > 0 && (
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">GST / Luxury Tax Taxes</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-500">Government Tax</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">₹{financials.taxAmount?.toLocaleString()}</td>
                  </tr>
                )}

                {financials.discountAmount > 0 && (
                  <tr>
                    <td className="py-3.5 px-4 font-semibold text-emerald-700">Applied Discount & Promotional Offers</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">Discount</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">-₹{financials.discountAmount?.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Status Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 block">Payment Settlement Status</span>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-slate-900 text-sm">
                  {isPaid ? 'PAID IN FULL (₹0 Balance Due)' : `Partial Payment (₹${financials.dueAmount?.toLocaleString()} Remaining)`}
                </span>
              </div>
            </div>

            <div className="text-right space-y-1 font-mono">
              <div className="text-slate-600 text-xs">
                Total Amount Billed: <span className="font-bold text-slate-900">₹{financials.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="text-emerald-700 text-xs font-bold">
                Total Amount Settled: <span>₹{financials.paidAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 border-t border-slate-100 text-slate-500 text-[11px] space-y-1">
            <p className="font-semibold text-slate-700">Thank you for staying with {hotel.name}! We wish you a safe and pleasant journey.</p>
            <p className="text-[10px]">This is a computer-generated tax invoice receipt and requires no physical signature.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

