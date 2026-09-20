'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, Download, Building2, CheckCircle2, ArrowLeft, Phone, Mail, MapPin, CreditCard, ShieldCheck } from 'lucide-react';

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
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
  };
  payments: Array<{
    date: string;
    amount: number;
    method: string;
    transactionId: string;
  }>;
}

function InvoicePrintContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || searchParams.get('reservationId') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invoice ID or Reservation ID is missing in request.');
      setLoading(false);
      return;
    }

    async function fetchInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/invoices/reservation/${encodeURIComponent(id)}`);
        if (!res.ok) {
          throw new Error('Invoice record not found.');
        }
        const json = await res.json();
        if (json.success && json.data) {
          setInvoice(json.data);
        } else {
          throw new Error(json.message || 'Failed to load invoice');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading invoice details.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-medium text-sm animate-pulse">Generating Official Invoice Preview...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Invoice Unavailable</h2>
          <p className="text-slate-400 text-xs">{error || 'Could not retrieve tax invoice for this booking.'}</p>
          <a
            href="/admin/checkin-checkout"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const { hotel, guest, booking, financials } = invoice;
  const isPaid = financials.dueAmount <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 py-8 px-4 print:bg-white print:p-0 print:text-black">
      {/* Action Header Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <a
            href="/admin/checkin-checkout"
            className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-lg font-black text-white tracking-wide">Tax Invoice Preview</h1>
            <p className="text-xs text-slate-400">Invoice #{invoice.invoiceNumber} • {guest.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Main Tax Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        {/* Top Decorative Header */}
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
            <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs uppercase tracking-widest border border-emerald-500/30 print:border-slate-900 print:text-slate-900">
              TAX INVOICE
            </div>
            <h3 className="text-xl font-mono font-bold text-white print:text-slate-900">{invoice.invoiceNumber}</h3>
            <p className="text-xs text-slate-400 print:text-slate-600">Date: {invoice.issuedDate}</p>
          </div>
        </div>

        {/* Invoice Body Container */}
        <div className="p-8 sm:p-10 space-y-8">
          {/* Guest & Booking Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-xs print:bg-white print:border-slate-300">
            <div className="space-y-2">
              <h4 className="font-extrabold uppercase tracking-wider text-slate-400 text-[10px]">Billed To (Guest Details)</h4>
              <p className="text-sm font-black text-slate-900">{guest.name}</p>
              <p className="text-slate-600">Phone: {guest.phone}</p>
              <p className="text-slate-600">Email: {guest.email || 'N/A'}</p>
              {guest.address && <p className="text-slate-600">Address: {guest.address}</p>}
            </div>

            <div className="space-y-2 sm:text-right">
              <h4 className="font-extrabold uppercase tracking-wider text-slate-400 text-[10px]">Reservation Info</h4>
              <p className="text-sm font-mono font-bold text-slate-900">Booking ID: {booking.bookingNumber}</p>
              <p className="text-slate-700 font-bold">Room: {booking.roomNumber} ({booking.roomType})</p>
              <p className="text-slate-600">Check-in: {booking.checkInDate}</p>
              <p className="text-slate-600">Check-out: {booking.checkOutDate}</p>
              <p className="text-slate-500 font-medium">Duration: {booking.nights} Night(s)</p>
            </div>
          </div>

          {/* Itemized Service Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px] print:bg-slate-200 print:text-slate-900">
                  <th className="py-3 px-4 rounded-l-xl print:rounded-none">Description</th>
                  <th className="py-3 px-4 text-center">Nights</th>
                  <th className="py-3 px-4 text-right">Rate / Night</th>
                  <th className="py-3 px-4 text-right rounded-r-xl print:rounded-none">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-800">
                    Room Accommodation ({booking.roomType} - Room {booking.roomNumber})
                  </td>
                  <td className="py-4 px-4 text-center text-slate-600">{booking.nights}</td>
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    ₹{(financials.baseAmount / Math.max(1, booking.nights)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{financials.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals & Bank Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start pt-4 border-t border-slate-200">
            {/* Payment & Bank Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs print:bg-white print:border-slate-300">
              <h5 className="font-extrabold uppercase tracking-wider text-slate-500 text-[10px]">Bank Details & UPI Payment</h5>
              <div className="space-y-1 text-slate-700">
                <p><span className="font-semibold text-slate-900">Bank Name:</span> {hotel.bankName || 'ICICI Bank'}</p>
                <p><span className="font-semibold text-slate-900">Account No:</span> {hotel.accountNo || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">IFSC Code:</span> {hotel.ifscCode || 'N/A'}</p>
                <p><span className="font-semibold text-slate-900">UPI ID:</span> {hotel.upiId || 'hotel@upi'}</p>
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="space-y-2 text-xs ml-auto w-full sm:max-w-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Room Subtotal:</span>
                <span className="font-mono font-semibold">₹{financials.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {financials.discountAmount > 0 && (
                <div className="flex justify-between py-1 text-emerald-600 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">- ₹{financials.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between py-1 text-slate-600">
                <span>GST Tax (12%):</span>
                <span className="font-mono font-semibold">+ ₹{financials.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-2.5 text-base font-black text-slate-900 border-t-2 border-b-2 border-slate-900 my-1">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-700">₹{financials.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 text-emerald-700 font-bold">
                <span>Paid Amount:</span>
                <span className="font-mono">₹{financials.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-800 font-extrabold">
                <span>Balance Due:</span>
                <span className={`font-mono ${financials.dueAmount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  ₹{financials.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Stamp / Payment Status Badge */}
          <div className="flex flex-wrap justify-between items-center pt-8 border-t border-slate-200 gap-4">
            <div className="flex items-center gap-3">
              {isPaid ? (
                <div className="px-4 py-2 rounded-2xl bg-emerald-100 text-emerald-800 border-2 border-emerald-400 font-black text-xs tracking-wider uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PAID IN FULL</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-400 font-black text-xs tracking-wider uppercase">
                  PARTIAL / PAYMENT PENDING
                </div>
              )}
            </div>

            <div className="text-right space-y-8">
              <p className="text-xs text-slate-500 font-medium">For {hotel.name}</p>
              <div className="pt-2 border-t border-dashed border-slate-400 text-[11px] font-bold text-slate-700">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-100 px-8 py-4 text-center text-[11px] text-slate-500 font-medium border-t border-slate-200">
          This is a computer-generated Tax Invoice and requires no physical signature. Thank you for staying with us!
        </div>
      </div>
    </div>
  );
}

export default function InvoicePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <p className="animate-pulse">Loading Invoice...</p>
        </div>
      }
    >
      <InvoicePrintContent />
    </Suspense>
  );
}
